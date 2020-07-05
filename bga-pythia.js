// ==UserScript==
// @name         BGA Pythia - 7 Wonders game helper
// @description  Visual aid that shows which cards each player holds
// @namespace    https://github.com/dpavliuchkov/bga-pythia
// @author       https://github.com/dpavliuchkov
// @version      0.2
// @include      *boardgamearena.com/*
// @grant        none
// ==/UserScript==
//
// On boardgamearena.com, you can play an exciting board game of 7 wonders.
// However, it is hard to remember which cards each player has. Pythia has
// godlike powers and will share this information with you.
// Works with Tampermonkey only.
// ==/UserScript==

// System variables - don't edit
const Is_Inside_Game = /\?table=[0-9]*/.test(window.location.href);
const Cards_Image = 'https://x.boardgamearena.net/data/themereleases/current/games/sevenwonders/200213-1215/img/cards.jpg';
const Player_Board_Id_Prefix = 'player_board_wrap_';
const Player_Cards_Id_Prefix = 'pythia_cards_wrap_';
const Player_Cards_Div_Class = 'pythia_cards_container';
const Enable_Logging = false;

// Styling variables - feel free to customize
const CSS_Player_Cards_Div_Top = '-50px';
const CSS_Player_Card_Zoom = 0.6;
const CSS_Player_Card_Height = '80px';
const CSS_Player_Card_Width = '128px';
const CSS_Player_Card_Title_Top = '-25px';
const CSS_Player_Card_Title_Font_Size = '18px';
const CSS_Player_Card_Title_Font_Color = 'black';

// Main Pythia object
var pythia = {
    dojo: null,
    game: null,
    playerHands: {},
    playerOrder: [],
    mainPlayer: null,
    currentAge: 1,

    // Init Pythia
    init: function() {
        this.dojo = window.parent.dojo;
        this.game = window.parent.gameui.gamedatas;
        this.playerOrder = this.game.playerorder;
        this.mainPlayer = this.playerOrder[0];

        for (var i = 0; i < this.playerOrder.length; i++) {
            this.playerHands[this.playerOrder[i]] = {};

            // Create player cards container
            if (this.playerOrder[i] == this.mainPlayer) {
                continue;
            }
            this.dojo.place('<div id="' + Player_Cards_Id_Prefix + this.playerOrder[i] + '"' +
                ' class="' + Player_Cards_Div_Class + '"' +
                ' style="position: absolute; left: 0; top: ' + CSS_Player_Cards_Div_Top + ';"></div>',
                Player_Board_Id_Prefix + this.playerOrder[i],
                'last');
        }

        this.dojo.subscribe("newHand", this, "readHand");
        this.dojo.subscribe("newAge", this, "changeAge");
        this.dojo.subscribe("cardsPlayed", this, "recordTurn");
        this.dojo.subscribe("discard", this, "recordDiscard");

        if (Enable_Logging) console.log("PYTHIA: My eyes can see everything!");
        return this;
    },

    // Check what came to main player in the new hand
    readHand: function(data) {
        if (Enable_Logging) console.log("PYTHIA: new hand - I got", data);
        // Rotate old hands and render cards
        if (!this.isFirstTurn()) {
            this.passCards();
            this.renderPlayerCards();
        }
        // Save new hand to main player
        this.playerHands[this.mainPlayer] = data.args.cards;
    },

    // Process all cards played by all players
    recordTurn: function(data) {
        if (Enable_Logging) console.log("PYTHIA: cards played - I got", data);

        // Delete played cards
        for (var cardId in data.args.cards) {
            var player = data.args.cards[cardId].location_arg;
            if (isObjectEmpty(this.playerHands[player])) {
                continue;
            }
            delete this.playerHands[player][cardId];
        }
    },

    // If main player discarded - we know what card it was
    recordDiscard: function(data) {
        if (Enable_Logging) console.log("PYTHIA: card discarded - I got", data);
        var player = data.channelorig.substring(9);
        delete this.playerHands[player][data.args.card_id];
    },

    // Cleanup things between ages
    changeAge: function(data) {
        if (Enable_Logging) console.log("PYTHIA: new age - I got", data);
        this.currentAge++;
        const keys = Object.keys(this.playerHands);
        for (const key of keys) {
            // Clean array of cards users have
            this.playerHands[key] = {};
        }

        // Clean rendered cards from previous age
        this.dojo.query('.' + Player_Cards_Div_Class).forEach(this.dojo.empty);
    },

    // Move cards unplayed cards between players
    passCards: function() {
        if (this.currentAge == 2) {
            this.passCardsLeft();
        } else {
            this.passCardsRight();
        }
    },
    passCardsLeft: function() {
        var currentHand = this.playerHands[this.mainPlayer];
        for (var position = 0; position < this.playerOrder.length - 1; position++) {
            this.playerHands[this.playerOrder[position]] = this.playerHands[this.playerOrder[position + 1]];
        }
        this.playerHands[this.playerOrder[this.playerOrder.length - 1]] = currentHand;
    },
    passCardsRight: function() {
        for (var position = this.playerOrder.length - 1; position > 0; position--) {
            this.playerHands[this.playerOrder[position]] = this.playerHands[this.playerOrder[position - 1]];
        }
    },

    // Render player hands
    renderPlayerCards: function() {
        for (var position in this.playerOrder) {
            var playerId = this.playerOrder[position];
            if (playerId == this.mainPlayer || isObjectEmpty(this.playerHands[playerId])) {
                continue;
            }

            var cardsHTML = '';
            var left = 0;
            for (var card in this.playerHands[playerId]) {
                var playedCard = this.game.card_types[this.playerHands[playerId][card].type];
                var posX = -playedCard.backx;
                var posY = -playedCard.backy;
                cardsHTML +=
                    '<div class="stockitem  stockitem_unselectable"' +
                    'style="zoom: ' + CSS_Player_Card_Zoom + '; background-position: ' + posX + 'px ' + posY + 'px;' +
                    'top: 0px; left: ' + left + 'px; width: ' + CSS_Player_Card_Width + '; height: ' + CSS_Player_Card_Height + ';' +
                    ' background-image: url(' + Cards_Image + '); opacity: 1; border-width: 0px;">';

                cardsHTML += '<span style="position: absolute; top: ' + CSS_Player_Card_Title_Top +
                    '; font-size: ' + CSS_Player_Card_Title_Font_Size +
                    '; color: ' + CSS_Player_Card_Title_Font_Color + ';">' + playedCard.nametr + '</span></div>';

                left += parseInt(CSS_Player_Card_Width) + 2;
            }
            this.dojo.place(cardsHTML, Player_Cards_Id_Prefix + playerId, "only");
        }
    },

    // Is this the first turn of the age?
    isFirstTurn: function() {
        return isObjectEmpty(this.playerHands[this.mainPlayer]);
    },
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isObjectEmpty(object) {
    return typeof(object) == "undefined" ||
        (Object.keys(object).length === 0 && object.constructor === Object);
}

// Everything starts here
window.onload = async function() {
    if (Is_Inside_Game) {
        await sleep(3000); // Wait for BGA to load dojo and 7W scripts
        if (window.parent.gameui.game_name != "sevenwonders") {
            return;
        }

        if (Enable_Logging) console.log("PYTHIA: I have come to serve you");

        window.parent.pythia = pythia.init();
    }
};
