import { Client } from 'seyfert';
import { ActivityType, PresenceUpdateStatus } from 'seyfert/lib/types';

const client = new Client();

client.start().then(async () => {
    client.uploadCommands();

    client.gateway.setPresence({
        activities: [{
            type: ActivityType.Playing,
            name: "on noplace.app!",
            state: " ",
        }],
        afk: false,
        since: Date.now(),
        status: PresenceUpdateStatus.Online,
    })
});