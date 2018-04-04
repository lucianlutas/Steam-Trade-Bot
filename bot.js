const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamComunity = require('steamcomunity');
const TradeOfferManager = require('steam-tradeoffer-manager');

const comunity = new SteamComunity();
const manager = new TradeOfferManager({
	steam: client,
	comunity: comunity,
	language: 'en'
});

const Prices = require('./prices.json');
const config = require('./config.json');

const client = new SteamUser();

const logOnOptions = {
  accountName: config.username,
  password: config.password,
  twoFactorCode: SteamTotp.generateAuthCode(config.sharedSecret)
};

client.logOn(logOnOptions);

client.on('loggedOn', () => {
  console.log('Logged into Steam');
  client.setPersona(SteamUser.Steam.EPersonaState.Online, config.displayName);
});

client.on("friendMessage", function(steamID, message){
	if(message == "!command"){
		client.chatMessage(steamID, "Response");
	}
});

client.on('webSession',(sessionid,cookies) =>{
	manager.setCookies(cookies);

	comunity.setCookies(cookies);
	comunity.startConfirmationChecker(20000, config.identitySecret);
});

function acceptOffer(offer){
	offer.accept((err) => {
		comunity.checkConfirmations();
		console.log("Offer accepted");
		if(err) console.log("There was an error accepting the offer.");
	});
}

function declineOffer(offer){
	offer.decline((err) => {
		console.log("Offer declines");
		if(err) console.log("There was an error declining the offer.");
	});
}

function processOffer(offer){
	if(offer.isGlitched() || offer.state === 11){
		console.log("Offer was glitched. Declining...");
		declineOffer(offer);
	}
	else if(offer.partner.getSteamID64 === config.ownerID){
		acceptOffer(offer);
	}
	else{
		var ourItems = offer.itemsToGive();
		var theirItems = offer.itemsToReceive;
		var ourVal = 0;
		var theirVal = 0;

		for(var i in ourItems){
			var item = ourItems[i].market_name;
			if(Prices[item]){
				ourVal += Prices[item].sell;
			}
			else{
				console.log("Invalid Value");
				ourVal += 99999;
			}
		}

		for(var i in theirItems){
			var item = theirItems[i].market_name;
			if(Prices[item]){
				theirVal += Prices[item].buy;
			}
			else{
				console.log("Their value was different");
			}
		}
	}
	console.log("Our value: " +ourVal);
	console.log("Their value: " +theirVal);

	if(ourVal <= theirVal){
		acceptOffer(offer);
	}
	else{
		declineOffer(offer);
	}
}

client.setOption("promptSteamGuardCode",false);

manager.on('newOffer', (offer) => {
	processOffer(offer);
});