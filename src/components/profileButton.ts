import { ActionRow, ComponentCommand, ComponentContext, Modal, TextInput } from "seyfert";
import { TextInputStyle } from "seyfert/lib/types";

export default class profileButton extends ComponentCommand {
    componentType = 'Button' as const;

    filter(ctx: ComponentContext<typeof this.componentType>) {
        return ctx.customId === 'profile-verify';
    }

    async run(ctx: ComponentContext<typeof this.componentType>) {
        const usernameInput = new TextInput()
            .setCustomId('profile-verify-username')
            .setPlaceholder('enter your username')
            .setLabel('username')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)

        const actionRow = new ActionRow<TextInput>()
            .addComponents([usernameInput])

        const modal = new Modal()
            .setCustomId('profile-verify-modal')
            .addComponents([actionRow])
            .setTitle('profile verification')

        return ctx.interaction.modal(modal);
    }
}