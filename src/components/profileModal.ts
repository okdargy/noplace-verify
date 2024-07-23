import { ActionRow, Button, Embed, ModalCommand, ModalContext, StringSelectMenu, StringSelectMenuInteraction, StringSelectOption } from 'seyfert';
import { ButtonStyle, MessageFlags } from 'seyfert/lib/types';
import { tools } from '../tools'

export interface SearchResponse {
  mutual_connections_count: number
  profile: Profile
  total_count: number
}

export interface Badge {
  animation_url: string
  icon_url: string
  name: string
  tooltip: string
}

export interface Profile {
  badges: Badge[]
  bio?: string
  birthday?: Date
  created_at: Date
  current_badge: string
  gender?: string
  level: number
  onboarding_complete: boolean
  profile_id: string
  profile_modes: any[]
  profile_picture_url?: string
  relationship_status?: string
  streaks: any[]
  target?: string
  updated_at: Date
  user_id: string
  username: string
  xp: number
}

export default class profileVerifyModal extends ModalCommand {
  filter(ctx: ModalContext) {
    return ctx.customId === 'profile-verify-modal';
  }

  async run(ctx: ModalContext) {
    const interaction = ctx.interaction;
    const username = interaction.getInputValue('profile-verify-username', true);

    if (username.includes('. ')) {
      return ctx.write({
        content: 'currently, noplace\'s api does not support usernames with periods. please contact an administrator to get manually verified.'
      });
    }

    const response = await fetch(`https://api.nospace.app/api/v1/search/${username}`, {
      headers: {
        Authorization: `Bearer ${tools.api.token}`,
        'User-Agent': 'noplace/1 CFNetwork/1559 Darwin/24.0.0',
        'content-type': 'application/json'
      }
    });

    const data: SearchResponse[] = await response.json();

    if (data.length === 0) {
      return ctx.write({
        content: `we couldn\'t quite find a user with the username: \`${username}\`. please try again.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const user = data.find((user) => user.profile.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      const options = data.map((user) => {
        return new StringSelectOption()
          .setLabel(user.profile.username)
          .setValue(user.profile.profile_id);
      });

      const stringSelectMenu = new StringSelectMenu();
      stringSelectMenu.setCustomId("profile-verify-username-select");
      stringSelectMenu.setOptions(options);

      const selectMenuRow = new ActionRow()
        .addComponents(stringSelectMenu);

      const responseEmbed = new Embed()
        .setTitle('🤔  hmm... we ran into a problem')
        .setDescription("we couldn't find the user you were looking for. maybe you meant one of these users?")


      const message = await ctx.write({
        embeds: [responseEmbed],
        components: [selectMenuRow],
        flags: MessageFlags.Ephemeral
      }, true); // true for fetchReply

      const collector = message.createComponentCollector({
        filter: (i) => i.user.id === ctx.author.id,
        onStop() {
          const timeoutEmbed = new Embed()
            .setColor('#ef4444')
            .setTitle('⌛  menu expired')
            .setDescription('you didn\'t select a user in time. please try again!');
          
          return ctx.editOrReply({
            embeds: [timeoutEmbed],
            components: [],
            flags: MessageFlags.Ephemeral
          })
        },
        idle: 60 * 1000
      });

      collector.run('profile-verify-username-select', async (interaction: StringSelectMenuInteraction) => {
        const user = data.find((user) => user.profile.profile_id === interaction.values[0]);

        if (!user) {
          return interaction.write({
            content: 'we couldn\'t find the user you were looking for. please try again.',
            flags: MessageFlags.Ephemeral
          });
        }

        return this.sendCode(ctx, user.profile.profile_id);
      })
    } else {
      return this.sendCode(ctx, user.profile.profile_id);
    }
  }

  async sendCode(ctx: ModalContext, profile_id: string) {
    const res = await fetch(`https://api.nospace.app/api/v1/profiles/${profile_id}`, {
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

    const data: Profile = await res.json();
    const code = tools.codes.generateCode(ctx.author.id, profile_id);

    const submitButton = new Button()
      .setCustomId('submit-profile-verify')
      .setLabel('submit')
      .setStyle(ButtonStyle.Success);

    const actionRow = new ActionRow()
      .addComponents(submitButton);

    const responseEmbed = new Embed()
      .setColor('#248046')
      .setTitle(`let's verify your identity, ${data.username.toLowerCase()}`)
      .setDescription(
        `to verify your identity, please copy the code below and paste it in your noplace **profile bio**.\n\nhere's your verification code: \`\`\`${code}\`\`\`\n> once you've done that, click the button below to verify your profile.`
      )

    return ctx.editOrReply({
      embeds: [responseEmbed],
      components: [actionRow],
      flags: MessageFlags.Ephemeral
    });
  }
}