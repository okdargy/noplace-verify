import { Client, ParseClient } from 'seyfert';
import { ActivityType, PresenceUpdateStatus } from 'seyfert/lib/types';

const client = new Client();

client.start().then(async () => {
    client.uploadCommands();

    client.gateway.setPresence({
        activities: [{
            type: ActivityType.Playing,
            name: "on noplace.live!",
            state: " ",
        }],
        afk: false,
        since: Date.now(),
        status: PresenceUpdateStatus.Online,
    })
});

declare module "seyfert" {
    interface UsingClient extends ParseClient<Client<true>> {}
}