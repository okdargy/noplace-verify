import { ComponentCommand, ComponentContext, Embed } from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { eq } from "drizzle-orm";

import { tools } from '../tools'
import { db } from "../db";
import { serversTable, userTable } from "../db/schema";
import { Profile } from "./profileModal";

export default class profileButton extends ComponentCommand {
    componentType = 'Button' as const;

    filter(ctx: ComponentContext<typeof this.componentType>) {
        return ctx.customId === 'submit-profile-verify';
    }

    async run(ctx: ComponentContext<typeof this.componentType>) {
        await ctx.deferReply(true);
        const code = tools.codes.findCode(ctx.interaction.user.id);

        if (!code) {
            const errorEmbed = new Embed()
                .setColor('#ef4444')
                .setTitle('🤔  hmm... we ran into a problem')
                .setDescription("we couldn't find a code for you. please try again.")

            return ctx.editOrReply({
                embeds: [errorEmbed],
                flags: MessageFlags.Ephemeral
            });
        }

        const res = await fetch(`https://api.nospace.app/api/v1/profiles/${code.profileId}`, {
            headers: {
                Authorization: `Bearer ${tools.api.token}`,
                'User-Agent': 'noplace/1 CFNetwork/1559 Darwin/24.0.0',
                'content-type': 'application/json'
            }
        })

        if (res.status !== 200) {
            const errorEmbed = new Embed()
                .setColor('#ef4444')
                .setTitle('🤔  hmm... we ran into a problem')
                .setDescription("we couldn't fetch the profile you were looking for. please try again.");

            return ctx.editOrReply({
                embeds: [errorEmbed],
                flags: MessageFlags.Ephemeral
            });
        }

        const user: Profile = await res.json();

        if(user.bio && user.bio.includes(code.code)) {
            const me = await ctx.me();
            if (!me) return ctx.write({
                content: 'i can\'t determine my own permissions, please contact an administrator.',
                flags: MessageFlags.Ephemeral
            });

            const guild = await ctx.guild();
            if(!guild) return ctx.write({
                content: 'i can\'t determine the guild you are in, please contact an administrator.',
                flags: MessageFlags.Ephemeral
            });
            
            const serverTable = await db.query.serversTable.findFirst({
                where: eq(serversTable.id, guild.id),
                with: { badges: true }
            })

            if(!serverTable) return ctx.write({
                content: 'this server is not configured to verify profiles, please contact an administrator.',
                flags: MessageFlags.Ephemeral
            });

            const successEmbed = new Embed()
                .setColor('#10B981')
                .setTitle('🎉  success!')
                .setDescription(`you've successfully verified your profile. you may now remove the code from your bio.`);

            let embeds: Embed[] = [successEmbed];

            if(!ctx.member) return ctx.write({
                content: 'i can\'t determine the member you are, please contact an administrator.',
                flags: MessageFlags.Ephemeral
            });

            // remove code
            tools.codes.removeCode(ctx.interaction.user.id);
            
            // add role
            const roleList = await guild.roles.list();
            const botHighestRole = await me.roles.highest();

            // verify role
            const verifyRole = roleList.find((role) => role.id === serverTable.serverRole);

            if (!verifyRole) {
                const errorEmbed = new Embed()
                    .setColor('#ef4444')
                    .setTitle('🤔  hmm... we ran into a problem')
                    .setDescription("we couldn't find the verification role. please contact an administrator.");
            
                embeds.push(errorEmbed);
            } else if (verifyRole.position < botHighestRole.position) {
                await ctx.member.roles.add(serverTable.serverRole);
            } else {
                const errorEmbed = new Embed()
                    .setColor('#ef4444')
                    .setTitle('🤔  hmm... we ran into a problem')
                    .setDescription("we couldn't add the role to you because the bot's role is lower than the verification role. please contact an administrator.");
            
                embeds.push(errorEmbed);
            }

            const userBadges = user.badges.map((badge) => badge.name);

            // badge roles
            for (const badge of serverTable.badges) {
                if(!userBadges.includes(badge.badge)) continue;
                const role = roleList.find((role) => role.id === badge.roleId);

                if (!role) {
                    const errorEmbed = new Embed()
                        .setColor('#ef4444')
                        .setTitle('🤔  hmm... we ran into a problem')
                        .setDescription(`we couldn't find a badge role you were supposed to recieve for your "${badge.badge}" badge. please contact an administrator.`);
                
                    embeds.push(errorEmbed);
                } else if (role.position < botHighestRole.position) {
                    ctx.member.roles.add(badge.roleId);
                } else {
                    const errorEmbed = new Embed()
                        .setColor('#ef4444')
                        .setTitle('🤔  hmm... we ran into a problem')
                        .setDescription(`we couldn't add the badge role for "${badge.badge}" to you because the bot's role is lower than the badge role. please contact an administrator.`);
                
                    embeds.push(errorEmbed);
                }
            }

            // change nickname
            await ctx.member.edit({ nick: '@' + user.username }).catch(() => {
                const errorEmbed = new Embed()
                    .setColor('#ef4444')
                    .setTitle('🤔  hmm... we ran into a problem')
                    .setDescription("we couldn't change your nickname. please contact an administrator.");
            
                embeds.push(errorEmbed);
            });
        
            try {
                await db
                    .insert(userTable)
                    .values({
                        id: ctx.interaction.user.id,
                        profileId: user.profile_id,
                        verified_at: new Date()
                    }).onConflictDoUpdate({
                        target: userTable.id,
                        set: {
                            profileId: user.profile_id,
                            verified_at: new Date()
                        }
                    })
            } catch (error) {
                const errorEmbed = new Embed()
                    .setColor('#ef4444')
                    .setTitle('🤔  hmm... we ran into a problem')
                    .setDescription("we couldn't insert your profile into the database. please contact an administrator.");
            
                embeds.push(errorEmbed);
            }

            return ctx.editOrReply({
                embeds: embeds,
                flags: MessageFlags.Ephemeral
            });
        } else {
            const errorEmbed = new Embed()
                .setColor('#ef4444')
                .setTitle('🤔  hmm... we ran into a problem')
                .setDescription("we couldn't find the code in your bio. please try again.");

            return ctx.editOrReply({
                embeds: [errorEmbed],
                flags: MessageFlags.Ephemeral
            });
        }
    }
}