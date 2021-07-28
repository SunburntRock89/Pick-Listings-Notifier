import config from "./config";
import { Client, Intents, Message, PartialMessage, Snowflake, TextChannel } from "discord.js";
import { Listing } from "./interfaces";
import fetch from "node-fetch";
import schedule from "node-schedule";
const FLAGS = Intents.FLAGS;

const client = new Client({
	intents: [
		FLAGS.GUILDS,
		FLAGS.GUILD_MESSAGES,
		FLAGS.GUILD_MESSAGE_REACTIONS,
	],
});

let pickListings: Listing[];
let pickAlertsChannel: TextChannel;

const getDateInEPGSkyFormat = (): string => {
	const date = new Date();
	let str = "";
	str += date.getFullYear();

	if ((date.getMonth() + 1) < 10) str += 0;
	str += (date.getMonth() + 1);

	if (date.getDate() < 10) str += 0;
	str += date.getDate();

	return str;
}

const getListings = async() => {
	pickListings = [];
	const res = await (await fetch(`http://awk.epgsky.com/hawk/linear/schedule/${getDateInEPGSkyFormat()}/1832`)).json();

	if (res.schedule.length == 0) {
		console.log("No listings returned");
		return;
	}
	for (let event of res.schedule[0].events) {
		pickListings.push({
			startTime: new Date(event.st * 1000),
			endTime: new Date((event.st + event.d) * 1000),
			duration: event.d,
			title: event.t,
			description: event.sy,
		})
	}
}

client.on("ready", async() => {
	console.log(`Logged in as ${client.user?.tag}!`);

	await getListings();

	pickAlertsChannel = client.channels.cache.get(`${config.pickAlertsChannel as Snowflake}`) as TextChannel;
	s.invoke();
});

const s = schedule.scheduleJob("PickCopShows", "* 30 * * * *", () => {
	const currentShow = pickListings.find(l => new Date() > l.startTime && new Date() < l.endTime)
	
	if (currentShow.title.match(/(Declare|Police|Patrol|Security|Stargate)/im)) {
		pickAlertsChannel.send({
			embeds: [{
				color: 0x00FF00,
				title: "✅ Everything is OK",
				description: `Pick are airing the usual:`,
				fields: [{
					name: currentShow.title,
					value: currentShow.description,
				}]
			}]
		})
	} else {
		pickAlertsChannel.send({
			embeds: [{
				color: 0xFFFF00,
				title: "⚠️ Warning!",
				description: `Pick are airing something out of the ordinary:`,
				fields: [{
					name: currentShow.title,
					value: currentShow.description,
				}]
			}]
		})
	}
});

const getListingsJob = schedule.scheduleJob("getListings", "* * 0 * * *", () => {
	getListings();
});

// client.on("guildCreate", async guild => {
// 	(await client.users.fetch(guild.ownerID)).send({
// 		embeds: [{
// 			color: 0xeb9f1c,
// 			title: "👋 Hey there!",
// 			description: "Thanks for inviting my bot! I hope it serves you well.",
// 			fields: [{
// 				name: "📋 Setup:",
// 				value: "Please ensure the bot has permission to embed links in any channels you intend to use it in.",
// 			},
// 			{
// 				name: "❓ Did you know?",
// 				value: "If you give the bot permission to delete messages, it will automatically shorten links too!",
// 			}],
// 			footer: {
// 				text: "Have fun! -- SunburntRock89#7062",
// 			},
// 		}],
// 	}).catch(null);
// });

client.login(config.token);

// https://discord.com/api/oauth2/authorize?client_id=828678339950018630&permissions=387136&scope=bot
