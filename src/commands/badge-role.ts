import { Declare, Command, type CommandContext, createStringOption, createRoleOption, Options, Embed } from 'seyfert';
import { MessageFlags } from 'seyfert/lib/types';

import { db } from '../db';
import { serverBadgeRoles } from '../db/schema';
import { and, eq } from 'drizzle-orm';

const options = { action: createStringOption({
    choices: [
        { name: "add", value: "add" },
        { name: "remove", value: "remove" },
        { name: "list", value: "list" }
    ],
    description: 'The action to perform',
    required: true
}),
badge: createStringOption({
    description: 'The badge to assign a role to',
    required: false
}),
role: createRoleOption({
    description: 'The role to assign to the user',
    required: false
})}

@Declare({
    name: 'badge-role',
    description: 'Assigns a role to a badge if a user has it.',
    defaultMemberPermissions: ['ManageGuild']
})
@Options(options)
export default class BadgeRoleCommand extends Command {
    async run(ctx: CommandContext<typeof options>) {
        const action = ctx.options.action;

        if (action == "add" || action == "remove") {
            const role = ctx.options.role;
            const badge = ctx.options.badge;
            if (!role || !badge) {
                return ctx.write({
                    content: 'please provide a role and badge to continue',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!badge.match(/^[a-zA-Z0-9 ]+$/)) {
                await ctx.write({
                    content: 'badge must be alphanumeric with spaces',
                    flags: MessageFlags.Ephemeral
                })
                return
            }

            if (!ctx.guildId) {
                return ctx.write({
                    content: 'this command can only be used in a server',
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                if(action == "add") {
                    const ins = await db
                        .insert(serverBadgeRoles)
                        .values({
                            id: ctx.guildId,
                            badge: badge,
                            roleId: role.id
                        }).onConflictDoNothing().execute()

                    if (ins.rowsAffected === 0) {
                        return await ctx.write({
                            content: 'badge role already exists, no changes made',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                } else if (action == "remove") {
                    const del = await db
                        .delete(serverBadgeRoles)
                        .where(and(
                            eq(serverBadgeRoles.id, ctx.guildId), 
                            eq(serverBadgeRoles.badge, badge),
                            eq(serverBadgeRoles.roleId, role.id)
                        ))
                        .execute()

                    if (del.rowsAffected === 0) {
                        return await ctx.write({
                            content: 'badge role does not exist, no changes made',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }

                const successEmbed = new Embed()
                    .setColor('#77b255')
                    .setTitle('✅  success')
                    .setDescription(`badge role added successfully`);

                return await ctx.write({
                    embeds: [successEmbed],
                    flags: MessageFlags.Ephemeral
                });
            } catch (e) {
                console.log(e)
                return await ctx.write({
                    content: 'error performing database operation, please try again',
                    flags: MessageFlags.Ephemeral
                })
            }
        } else if (action == "list") {
            if (!ctx.guildId) {
                return ctx.write({
                    content: 'this command can only be used in a server',
                    flags: MessageFlags.Ephemeral
                });
            }

            const roles = await db.query.serverBadgeRoles.findMany({
                where: eq(serverBadgeRoles.id, ctx.guildId)
            })

            if (roles.length === 0) {
                return await ctx.write({
                    content: 'no badge roles found',
                    flags: MessageFlags.Ephemeral
                });
            }

            let content = '';

            for (const role of roles) {
                content += `**${role.badge}**: <@&${role.roleId}> (${role.roleId})\n`;
            }

            const listEmbed = new Embed()
                .setColor('#ffdb89')
                .setTitle('📜  badge roles')
                .setDescription(content);

            return await ctx.write({
                embeds: [listEmbed],
                flags: MessageFlags.Ephemeral
            });
        }
    }
}