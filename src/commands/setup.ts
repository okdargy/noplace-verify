import { db } from '../db';
import { serversTable } from '../db/schema';
import { Declare, Command, type CommandContext, createRoleOption, createChannelOption, Options, createStringOption, Embed, Button, ActionRow } from 'seyfert';
import { ButtonStyle, ChannelType, MessageFlags } from 'seyfert/lib/types';

const options = {
    role: createRoleOption({
        description: 'Role to give to the user after verification',
        required: true
    }),
    channel: createChannelOption({
        description: 'Channel to send the verification message',
        channel_types: [ChannelType.GuildText],
        required: true
    }),
    image: createStringOption({
        description: 'Image to send in the verification message (on request of grim)',
        required: false
    }),
    color: createStringOption({
        description: 'Color of the embed (hex codes only)',
        required: false
    })
}

@Declare({
    name: 'setup',
    description: 'Setup the verification system for the server',
    defaultMemberPermissions: ['ManageGuild']
})
@Options(options)
export default class PingCommand extends Command {
    async run(ctx: CommandContext<typeof options>) {
        
        const verifyRole = ctx.options.role;
        
        const embedChannel = ctx.options.channel;
        
        const image = ctx.options.image;
        
        const color = ctx.options.color;

        if (!verifyRole && !embedChannel) {
            return ctx.write({
                content: 'please provide a role and channel to continue',
                flags: MessageFlags.Ephemeral
            });
        }

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

        const permissions = await ctx.client.channels.memberPermissions(embedChannel.id, me);
        if (!permissions.has(['SendMessages', 'EmbedLinks'])) return ctx.write({
            content: 'i need the permissions to send messages and embed links in the channel you provided',
            flags: MessageFlags.Ephemeral
        });

        const roleList = await guild.roles.list();
        const botHighestRole = await me.roles.highest();
        const finalRole = roleList.find((role) => role.id === verifyRole.id);

        if (!finalRole) {
            return ctx.write({
                content: 'the role provided is not a valid role',
                flags: MessageFlags.Ephemeral
            });
        } else if (finalRole.position >= botHighestRole.position) {
            return ctx.write({
                content: 'i can\'t add the role to the user because the bot\'s role is lower than the verification role',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await db
                .insert(serversTable)
                .values({
                    id: ctx.guildId as string,
                    serverChannel: embedChannel.id,
                    serverRole: verifyRole.id
                })
                .onConflictDoUpdate({
                    target: serversTable.id,
                    set: {
                        serverChannel: embedChannel.id,
                        serverRole: verifyRole.id
                    }
                })
        } catch (error) {
            return ctx.write({
                content: 'an error occurred while inserting the server config into the database',
                flags: MessageFlags.Ephemeral
            });
        }

        const verifyEmbed = new Embed()
            .setTitle('verify your noplace profile')
            .setDescription('to gain access to the server, you must verify your profile on the noplace platform. this will change your nickname to match your username on the platform in order for others to easily identify you.\n\nclick pick a form of identification to start the verification process.\n\n> **note:** this process is automated. we only store your discord id, profile id and the date you verified your profile.')

        if(image) {
            if(isURL(image)) {
                verifyEmbed.setImage(image);
            } else {
                return ctx.write({
                    content: 'the image provided is not a valid URL',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if(color) {
            if(isHexCode(color)) {
                verifyEmbed.setColor(color);
            } else {
                return ctx.write({
                    content: 'the color provided is not a valid hex code (ex: #ff0000)',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        const profileVerifyButton = new Button()
            .setCustomId('profile-verify')
            .setLabel('profile verify')
            .setStyle(ButtonStyle.Success);

        const actionRow = new ActionRow()
            .addComponents(profileVerifyButton);

        await ctx.client.messages.write(embedChannel.id, {
            embeds: [verifyEmbed],
            components: [actionRow],
        });

        return ctx.write({
            content: 'the verification system has been successfully set up!',
            flags: MessageFlags.Ephemeral
        });
    }
}

const isURL = (str: string) => {
    var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
    var url = new RegExp(urlRegex, 'i');
    return str.length < 2083 && url.test(str);
}

const isHexCode = (str: string): str is `#${string}` => {
    return /^#[0-9A-F]{6}$/i.test(str);
}