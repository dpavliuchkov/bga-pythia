// ==UserScript==
// @name         BGA Pythia - 7 Wonders game helper
// @description  Visual aid that shows which cards each player holds, and how war affects the scores
// @namespace    https://github.com/dpavliuchkov/bga-pythia
// @author       https://github.com/dpavliuchkov
// @version      0.4
// @include      *boardgamearena.com/*
// @grant        none
// ==/UserScript==
//
// On boardgamearena.com, you can play an exciting board game of 7 wonders.
// However, it is hard to remember which cards each player has. Pythia has
// godlike powers and will share this information with you. It will also
// display total player's score based on the current shields situation.
// And it will mark leader and runner up players and their boards.
// Works with Tampermonkey only.
// ==/UserScript==

// System variables - don't edit
const Is_Inside_Game = /\?table=[0-9]*/.test(window.location.href);
const Cards_Image = 'https://x.boardgamearena.net/data/themereleases/current/games/sevenwonders/200213-1215/img/cards.jpg';
const BGA_Player_Board_Id_Prefix = 'player_board_wrap_';
const BGA_Player_Score_Id_Prefix = 'player_score_';
const Player_Cards_Id_Prefix = 'pythia_cards_wrap_';
const Player_Score_Id_Prefix = 'pythia_score_';
const Player_Cards_Div_Class = 'pythia_cards_container';
const Player_Score_Span_Class = 'pythia_score';
const Player_Leader_Class = 'pythia_leader';
const Player_Runnerup_Class = 'pythia_runnerup';
const War_Points_Per_Age = {
    1: 1,
    2: 3,
    3: 5
};
const Enable_Logging = false;

// Styling variables - feel free to customize
const CSS_Player_Cards_Div_Height = '50px';
const CSS_Player_Card_Zoom = 0.6;
const CSS_Player_Card_Height = '45px';
const CSS_Player_Card_Width = '128px';
const CSS_Player_Card_Title_Top = '-25px';
const CSS_Player_Card_Title_Font_Size = '18px';
const CSS_Player_Card_Title_Font_Color = 'black';


// Main Pythia object
var pythia = {
    isStarted: false,
    dojo: null,
    game: null,
    mainPlayer: null,
    currentAge: 1,
    playersCount: 0,
    players: [],

    // Init Pythia
    init: function() {
        this.isStarted = true;
        this.dojo = window.parent.dojo;
        this.game = window.parent.gameui.gamedatas;
        var playerOrder = this.game.playerorder;
        this.playersCount = playerOrder.length;
        this.mainPlayer = playerOrder[0];

        for (var i = 0; i < this.playersCount; i++) {
            var playerId = playerOrder[i];
            this.players[playerId] = {
                hand: {},
                coins: 3,
                shields: 0,
                bgaScore: 1,
                warScore: 0,
                wonder: this.game.players[playerId].wonder
            };

            // Identify who sits to the left and to the right
            if (playerId == this.mainPlayer) {
                this.players[playerId].left = playerOrder[this.playersCount - 1];
            } else {
                this.players[playerId].left = playerOrder[i - 1];
            }
            if (playerId == playerOrder[this.playersCount - 1]) {
                this.players[playerId].right = this.mainPlayer;
            } else {
                this.players[playerId].right = playerOrder[i + 1];
            }

            this.renderPythiaContainers(playerId);
        }

        this.dojo.subscribe("newHand", this, "recordHand");
        this.dojo.subscribe("cardsPlayed", this, "recordTurn");
        this.dojo.subscribe("coinDelta", this, "recordCoins");
        this.dojo.subscribe("discard", this, "recordDiscard");
        this.dojo.subscribe("wonderBuild", this, "recordWonderStage");
        this.dojo.subscribe("updateScore", this, "recordScoreUpdate");
        this.dojo.subscribe("warVictory", this, "recordWarResults");
        this.dojo.subscribe("newAge", this, "changeAge");

        this.setStyles();

        if (Enable_Logging) console.log("PYTHIA: My eyes can see everything!");
        return this;
    },

    // Check what came to main player in the new hand
    recordHand: function(data) {
        if (Enable_Logging) console.log("PYTHIA: new hand - I got", data);

        // Rotate old hands and render cards
        if (!this.isFirstTurn()) {
            this.passCards();
            this.renderPlayerCards();
        }
        // Save new hand to main player
        this.players[this.mainPlayer].hand = data.args.cards;

        // Update leader & runnerup positions
        this.renderLeaderRunnerup();
    },

    // Process all cards played by all players
    recordTurn: function(data) {
        if (Enable_Logging) console.log("PYTHIA: cards played - I got", data);

        var warPlayed = false;

        // Cycle all played cards
        for (var cardId in data.args.cards) {
            var card = data.args.cards[cardId];
            var player = card.location_arg;

            // Track if played card was military
            if (this.game.card_types[card.type].category == "mil") {
                warPlayed = true;
                this.players[player].shields += this.game.card_types[card.type].shield;
            }

            // Delete played card
            if (isObjectEmpty(this.players[player].hand)) {
                continue;
            }
            delete this.players[player].hand[cardId];
        }
        if (warPlayed) {
            this.calculateWarScores();
        }
    },

    recordCoins: function(data) {
        if (Enable_Logging) console.log("PYTHIA: coins changed - I got", data);

        //  debugger;
        this.players[data.args.player_id].coins += data.args.coinddelta;
    },

    // If main player discarded - we know what card it was
    recordDiscard: function(data) {
        if (Enable_Logging) console.log("PYTHIA: card discarded - I got", data);

        var player = data.channelorig.substring(9);
        delete this.players[player].hand[data.args.card_id];
    },

    // If Rhodos built a stage - it could have shields
    recordWonderStage: function(data) {
        if (Enable_Logging) console.log("PYTHIA: wonder built - I got", data);

        const playerId = data.args.player_id;
        const stage = data.args.step;
        const wonderId = this.players[playerId].wonder;
        if (this.game.wonders[wonderId].stages[stage].shield) {
            this.players[playerId].shields += this.game.wonders[wonderId].stages[stage].shield;
            this.calculateWarScores();
        }
    },

    // Update internal scores as well
    recordScoreUpdate: function(data) {
        if (Enable_Logging) console.log("PYTHIA: scores updated - I got", data);

        const scores = Object.keys(data.args.scores);
        for (const playerId of scores) {
            this.players[playerId].bgaScore = data.args.scores[playerId];
            this.renderPlayerScore(playerId);
        }
    },

    // If this is the last war - do cleanup
    recordWarResults: function(data) {
        if (Enable_Logging) console.log("PYTHIA: war battle happened - I got", data);

        if (this.currentAge == 3) {
            // Hide Pythia scores
            this.dojo.query('.' + Player_Score_Span_Class).style('display', 'none');

            // Remove Pythia leader & runnerup notation
            if (this.dojo.query('.' + Player_Leader_Class)[0]) {
                this.dojo.removeClass(this.dojo.query('.' + Player_Leader_Class)[0].id, Player_Leader_Class);
            }
            if (this.dojo.query('.' + Player_Runnerup_Class)[0]) {
                this.dojo.removeClass(this.dojo.query('.' + Player_Runnerup_Class)[0].id, Player_Runnerup_Class);
            }
        }
    },

    // Calculate additional score from shields
    calculateWarScores: function() {
        var currentPlayerId = this.mainPlayer;
        var i = 0;
        while (i < this.playersCount) {
            var thisPlayer = this.players[currentPlayerId];
            thisPlayer.warScore = 0;

            // Check battles with right neighbour
            var rightPlayer = this.players[thisPlayer.right];
            if (thisPlayer.shields > rightPlayer.shields) {
                this.increaseWarScore(currentPlayerId, this.currentAge);
            } else if (thisPlayer.shields < rightPlayer.shields) {
                this.decreaseWarScore(currentPlayerId, this.currentAge);
            }

            // Check battles with left neighbour
            var leftPlayer = this.players[thisPlayer.left];
            if (thisPlayer.shields > leftPlayer.shields) {
                this.increaseWarScore(currentPlayerId, this.currentAge);
            } else if (thisPlayer.shields < leftPlayer.shields) {
                this.decreaseWarScore(currentPlayerId, this.currentAge);
            }

            currentPlayerId = thisPlayer.right;
            i++;
        }
    },

    // Cleanup things between ages
    changeAge: function(data) {
        if (Enable_Logging) console.log("PYTHIA: new age - I got", data);

        this.currentAge++;

        // Recalculate war scores for the new age
        this.calculateWarScores();

        const keys = Object.keys(this.players);
        for (const playerId of keys) {
            // Clean player hands and update total scores
            this.players[playerId].hand = {};
            this.renderPlayerScore(playerId);
            this.renderLeaderRunnerup();
        }

        // Clean rendered cards from previous age
        this.dojo.query('.' + Player_Cards_Div_Class).forEach(this.dojo.empty);
    },

    // Add war scores based on the age
    increaseWarScore: function(playerId, age) {
        this.players[playerId].warScore += War_Points_Per_Age[age];
    },
    // Decrase war scores
    decreaseWarScore: function(playerId, age) {
        this.players[playerId].warScore -= 1;
    },

    // Move cards unplayed cards between players
    passCards: function() {
        // This should be counter to age direction, because
        // Pythia always passes starting from the last player
        var direction = this.currentAge == 2 ? 'right' : 'left';
        var currentPlayerId = this.mainPlayer;
        var i = 0;
        while (i < this.playersCount) {
            var neighborId = this.players[currentPlayerId][direction];
            this.players[neighborId].hand = this.players[this.players[neighborId][direction]].hand;
            currentPlayerId = neighborId;
            i++;
        }
    },

    // Render player containers
    renderPythiaContainers: function(playerId) {
        // Insert war score container
        if (!this.dojo.byId(Player_Score_Id_Prefix + playerId)) {
            this.dojo.place(
                '<span id="' + Player_Score_Id_Prefix + playerId + '"' +
                'class="player_score_value ' + Player_Score_Span_Class + '"></span>',
                BGA_Player_Score_Id_Prefix + playerId,
                'after');
        }

        // Insert card container
        if (playerId == this.mainPlayer || this.dojo.byId(Player_Cards_Id_Prefix + playerId)) {
            return;
        }
        this.dojo.place('<div id="' + Player_Cards_Id_Prefix + playerId + '"' +
            ' class="' + Player_Cards_Div_Class + '"' +
            ' style="height: ' + CSS_Player_Cards_Div_Height + ';"></div>',
            BGA_Player_Board_Id_Prefix + playerId,
            'first');
    },

    // Render player hands
    renderPlayerCards: function() {
        const keys = Object.keys(this.players);
        for (const playerId of keys) {
            if (playerId == this.mainPlayer || isObjectEmpty(this.players[playerId].hand)) {
                continue;
            }

            var cardsHTML = '';
            var left = 7;
            for (var card in this.players[playerId].hand) {
                var playedCard = this.game.card_types[this.players[playerId].hand[card].type];
                var posX = -playedCard.backx;
                var posY = -playedCard.backy;
                cardsHTML +=
                    '<div class="stockitem  stockitem_unselectable"' +
                    'style="zoom: ' + CSS_Player_Card_Zoom + '; background-position: ' + posX + 'px ' + posY + 'px;' +
                    'top: 25px; left: ' + left + 'px; width: ' + CSS_Player_Card_Width + '; height: ' + CSS_Player_Card_Height + ';' +
                    ' background-image: url(' + Cards_Image + '); opacity: 1; border-width: 0px;">';

                cardsHTML += '<span style="position: absolute; top: ' + CSS_Player_Card_Title_Top +
                    '; font-size: ' + CSS_Player_Card_Title_Font_Size +
                    '; color: ' + CSS_Player_Card_Title_Font_Color + ';">' + playedCard.nametr + '</span></div>';

                left += parseInt(CSS_Player_Card_Width) + 2;
            }
            this.dojo.place(cardsHTML, Player_Cards_Id_Prefix + playerId, "only");
        }
    },

    // Update total player score
    renderPlayerScore: function(playerId, score = 0) {
        const totalScore = this.players[playerId].bgaScore + this.players[playerId].warScore;
        this.dojo.byId(Player_Score_Id_Prefix + playerId).innerHTML = " (" + totalScore + ")";
    },

    renderLeaderRunnerup: function() {
        // Clean previous leader & runnerup - fucked up way, but no idea how to make it nicer
        if (this.dojo.query('.' + Player_Leader_Class)[0]) {
            this.dojo.removeClass(this.dojo.query('.' + Player_Leader_Class)[0].id, Player_Leader_Class);
        }
        if (this.dojo.query('.' + Player_Runnerup_Class)[0]) {
            this.dojo.removeClass(this.dojo.query('.' + Player_Runnerup_Class)[0].id, Player_Runnerup_Class);
        }

        // Find leader and runner ups
        var totalScores = [];
        const keys = Object.keys(this.players);
        for (const playerId of keys) {
            totalScores.push(
                [playerId,
                    this.players[playerId].bgaScore + this.players[playerId].warScore,
                    this.players[playerId].coins
                ]);
        }

        totalScores.sort(function(a, b) {
            return b[1] - a[1] || b[2] - a[2];;
        });

        // Mark new ones
        this.dojo.addClass(BGA_Player_Board_Id_Prefix + totalScores[0][0], Player_Leader_Class);
        this.dojo.addClass(BGA_Player_Board_Id_Prefix + totalScores[1][0], Player_Runnerup_Class);
    },
    // Is this the first turn of the age?
    isFirstTurn: function() {
        return isObjectEmpty(this.players[this.mainPlayer].hand);
    },
    setStyles: function() {
        this.dojo.place(
            '<style type="text/css" id="Pythia_Styles">' +
            '.sw_coins { top: 50px; } ' +
            '#player_board_wrap_' + this.mainPlayer + ' .sw_coins { top: 0px; } ' +
            '.' + Player_Leader_Class + " { border: 5px solid green; } " +
            '.' + Player_Leader_Class + " h3::before { content: '(Leader) '; color: green; float: left; margin-top: -4px; white-space: pre; }" +
            '.' + Player_Runnerup_Class + " { border: 5px solid red; } " +
            '.' + Player_Runnerup_Class + " h3::before { content: '(Runner up) '; color: red; float: left; margin-top: -4px; white-space: pre; }" +
            '</style>', 'sevenwonder_wrap', 'last');
    }
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

        // Prevent multiple launches
        if (window.parent.pythia && window.parent.pythia.isStarted) {
            return;
        } else {
            if (Enable_Logging) console.log("PYTHIA: I have come to serve you");
            window.parent.pythia = pythia.init();
        }
    }
};
