// ==UserScript==
// @name         BGA Pythia - 7 Wonders game helper
// @description  Visual aid that extends BGA game interface with useful information
// @namespace    https://github.com/dpavliuchkov/bga-pythia
// @author       https://github.com/dpavliuchkov
// @version      0.7.1
// @include      *boardgamearena.com/*
// @grant        none
// ==/UserScript==
//
// On boardgamearena.com, you can play an exciting board game of 7 wonders.
// However, it is hard to remember which cards each player has. Pythia has
// godlike powers and will share this information with you. It will also
// display total player's score based on the current shields situation.
// And it will mark leader and runner up players and their boards. And
// Pythia will calculate how much points and coins some cards are worth to you.
// Works with Tampermonkey only.
// ==/UserScript==

// System variables - don't edit
const Is_Inside_Game = /\?table=[0-9]*/.test(window.location.href);
const Cards_Image = "https://x.boardgamearena.net/data/themereleases/current/games/sevenwonders/200213-1215/img/cards.jpg";
const BGA_Player_Board_Id_Prefix = "player_board_wrap_";
const BGA_Player_Score_Id_Prefix = "player_score_";
const Card_Worth_Id_Prefix = "pythia_card_worth_container_";
const Card_Worth_Class = "pythia_card_worth";
const Card_Worth_Coins_Class = "pythia_card_coins_worth";
const Player_Cards_Id_Prefix = "pythia_cards_wrap_";
const Player_Score_Id_Prefix = "pythia_score_";
const Player_Cards_Div_Class = "pythia_cards_container";
const Player_Score_Span_Class = "pythia_score";
const Player_Leader_Class = "pythia_leader";
const Player_Runnerup_Class = "pythia_runnerup";
const War_Points_Per_Age = {
    "1": 1,
    "2": 3,
    "3": 5
};
const Victory_Points_Image = {
    "-1": "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/minus%201%20point.png?raw=true",
    "-2": "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/minus%202%20points.png?raw=true",
    0: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/0%20points.png?raw=true",
    1: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/1%20point.png?raw=true",
    2: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/2%20points.png?raw=true",
    3: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/3%20points.png?raw=true",
    4: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/4%20points.png?raw=true",
    5: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/5%20points.png?raw=true",
    6: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/6%20points.png?raw=true",
    7: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/7%20points.png?raw=true",
    8: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/8%20points.png?raw=true",
    9: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/9%20points.png?raw=true",
    10: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/10%20points.png?raw=true",
    11: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/11%20points.png?raw=true",
    12: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/12%20points.png?raw=true",
    13: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/13%20points.png?raw=true",
    14: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/14%20points.png?raw=true",
};
const Coins_Image = {
    0: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/0%20coins.png?raw=true",
    1: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/1%20coin.png?raw=true",
    2: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/2%20coins.png?raw=true",
    3: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/3%20coins.png?raw=true",
    4: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/4%20coins.png?raw=true",
    5: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/5%20coins.png?raw=true",
    6: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/6%20coins.png?raw=true",
    7: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/7%20coins.png?raw=true",
    8: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/8%20coins.png?raw=true",
    9: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/9%20coins.png?raw=true",
    10: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/10%20coins.png?raw=true",
    11: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/11%20coins.png?raw=true",
    12: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/12%20coins.png?raw=true",
    13: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/13%20coins.png?raw=true",
    14: "https://github.com/dpavliuchkov/bga-pythia/blob/master/images/14%20coins.png?raw=true",
};
const Enable_Logging = false;

// Styling variables - feel free to customize
const CSS_Player_Cards_Div_Height = "50px";
const CSS_Player_Card_Zoom = 0.6;
const CSS_Player_Card_Height = "45px";
const CSS_Player_Card_Width = "128px";
const CSS_Player_Card_Title_Top = "-25px";
const CSS_Player_Card_Title_Font_Size = "18px";
const CSS_Player_Card_Title_Font_Color = "black";


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
        // Check if the site was loaded correctly
        if (!window.parent || !window.parent.dojo || !window.parent.gameui.gamedatas
            || !window.parent.gameui.gamedatas.playerorder || !window.parent.gameui.gamedatas.playerorder[0]
            || !window.parent.gameui.gamedatas.card_types || !window.parent.gameui.gamedatas.wonders) {
            return;
        }
        this.dojo = window.parent.dojo;
        this.game = window.parent.gameui.gamedatas;
        var playerOrder = this.game.playerorder;
        this.playersCount = playerOrder.length;
        this.mainPlayer = playerOrder[0];
        // local storage stores value as strings, so we need to parse "false" and "true" to get boolean
        this.settings = {
            'enableRecordCards': localStorage.getItem('pythia-seetings-recordcards') === null ?
                true : String(localStorage.getItem('pythia-seetings-recordcards')) == "true",
            'enableWarScores': localStorage.getItem('pythia-seetings-warscores') === null ?
                true : String(localStorage.getItem('pythia-seetings-warscores')) == "true",
            'enableLeaderRunnerupPositions': localStorage.getItem('pythia-seetings-leaderrunnerup') === null ?
                true : String(localStorage.getItem('pythia-seetings-leaderrunnerup')) == "true",
            'enableCardPoints': localStorage.getItem('pythia-seetings-cardpoints') === null ?
                true : String(localStorage.getItem('pythia-seetings-cardpoints')) == "true",
        };

        for (var i = 0; i < this.playersCount; i++) {
            var playerId = playerOrder[i];
            this.players[playerId] = {
                hand: {},
                coins: 3,
                shields: 0,
                defeats: 0,
                bgaScore: 1,
                warScore: 0,
                wonder: 0,
                wonderStages: 0,
                playedCards: {
                    "raw": 0,
                    "man": 0,
                    "com": 0,
                    "mil": 0,
                    "civ": 0,
                    "sci": 0,
                    "gui": 0,
                },
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

        this.renderPythiaMenu();
        this.setStyles();

        // Configure Pythia according to settings
        this.togglePythiaSettingPlayerCardsDisplay(this.settings.enableRecordCards);
        this.togglePythiaSettingWarScoresDisplay(this.settings.enableWarScores);
        this.togglePythiaSettingLeaderRunnerupDisplay(this.settings.enableLeaderRunnerupPositions);
        this.togglePythiaSettingCardPointsDisplay(this.settings.enableCardPoints);

        // Connect event handlers to follow game progress
        this.dojo.subscribe("newHand", this, "recordHand");
        this.dojo.subscribe("cardsPlayed", this, "recordTurn");
        this.dojo.subscribe("coinDelta", this, "recordCoins");
        this.dojo.subscribe("discard", this, "recordDiscard");
        this.dojo.subscribe("newWonders", this, "recordWonderChoice");
        this.dojo.subscribe("wonderBuild", this, "recordWonderStage");
        this.dojo.subscribe("updateScore", this, "recordScoreUpdate");
        this.dojo.subscribe("warVictory", this, "recordWarResults");
        this.dojo.subscribe("newAge", this, "changeAge");

        if (Enable_Logging) console.log("PYTHIA: My eyes can see everything!");
        return this;
    },

    // Check what came to main player in the new hand
    recordHand: function(data) {
        if (Enable_Logging) console.log("PYTHIA: new hand - I got", data);

        // Input check
        if (!data || !data.args || !data.args.cards) {
            return;
        } 

        // Rotate old hands and render cards
        if (!this.isFirstTurn()) {
            this.passCards();
            this.renderPlayerCards();
        }
        // Save new hand to main player
        this.players[this.mainPlayer].hand = data.args.cards;

        // Calculate worth of some cards in victory points and coins
        if (this.currentAge == 2 || this.currentAge == 3) {
            // Cycle all cards in hand
            for (var cardId in data.args.cards) {
                const playedCard = data.args.cards[cardId];
                const leftPlayerId = this.players[this.mainPlayer].left;
                const rightPlayerId = this.players[this.mainPlayer].right;

                var pointsWorth = null;
                var coinsWorth = null;
                switch (parseInt(playedCard.type)) {
                    // Age 2 commerce
                    case 41: // Vineyard - coins for brown cards
                        coinsWorth = this.players[leftPlayerId].playedCards["raw"] + this.players[rightPlayerId].playedCards["raw"]
                        + this.players[this.mainPlayer].playedCards["raw"];
                        break;
                    case 42: // Bazaar - coins for grey cards
                        coinsWorth = (this.players[leftPlayerId].playedCards["man"] + this.players[rightPlayerId].playedCards["man"]
                        + this.players[this.mainPlayer].playedCards["man"]) * 2;
                        break;

                    // Age 3 guilds
                    case 51: // Workers guild - brown cards
                        pointsWorth = this.players[leftPlayerId].playedCards["raw"] + this.players[rightPlayerId].playedCards["raw"];
                        break;
                    case 52: // Craftsmens guild - grey cards
                        pointsWorth = 2 * (this.players[leftPlayerId].playedCards["man"] + this.players[rightPlayerId].playedCards["man"]);
                        break;
                    case 53: // Traders guild - yellow cards
                        pointsWorth = this.players[leftPlayerId].playedCards["com"] + this.players[rightPlayerId].playedCards["com"];
                        break;
                    case 54: // Philosopehrs guild - yellow cards
                        pointsWorth = this.players[leftPlayerId].playedCards["sci"] + this.players[rightPlayerId].playedCards["sci"];
                        break;
                    case 55: // Spies guild - red cards
                        pointsWorth = this.players[leftPlayerId].playedCards["mil"] + this.players[rightPlayerId].playedCards["mil"];
                        break;
                    case 56: // Strategist guild - defeat tokens
                        pointsWorth = this.players[leftPlayerId].defeats + this.players[rightPlayerId].defeats;
                        break;
                    case 57: // Shipowners guild - own brown grey purple cards
                        pointsWorth = this.players[this.mainPlayer].playedCards["raw"] + this.players[this.mainPlayer].playedCards["man"]
                            + this.players[this.mainPlayer].playedCards["gui"] + 1;
                        break;
                    case 59: // Magistrate guild - blue cards
                        pointsWorth = this.players[leftPlayerId].playedCards["civ"] + this.players[rightPlayerId].playedCards["civ"];
                        break;
                    case 60: // Builders guild - wonder stages]
                        pointsWorth = this.players[this.mainPlayer].wonderStages + this.players[leftPlayerId].wonderStages
                            + this.players[rightPlayerId].wonderStages;
                        break;

                    // Age 3 commerce
                    case 66: // Haven - coins and points for own brown cards
                        coinsWorth = this.players[this.mainPlayer].playedCards["raw"];
                        pointsWorth = this.players[this.mainPlayer].playedCards["raw"];
                        break;
                    case 67: // Lighthouse - coins and points for own yellow cards
                        coinsWorth = this.players[this.mainPlayer].playedCards["com"] + 1;
                        pointsWorth = this.players[this.mainPlayer].playedCards["com"] + 1;
                        break;
                    case 68: // Chamber of commerce - coins and points for own grey cards
                        coinsWorth = this.players[this.mainPlayer].playedCards["man"] * 2;
                        pointsWorth = this.players[this.mainPlayer].playedCards["man"] * 2;
                        break;
                    case 69: // Arena - coins and points for own wonder stages
                        coinsWorth = this.players[this.mainPlayer].wonderStages * 3;
                        pointsWorth = this.players[this.mainPlayer].wonderStages;
                        break;
                }
                this.renderCardPoints(cardId, pointsWorth, coinsWorth);
            }
        }

        // Update leader & runnerup positions
        this.renderLeaderRunnerup();
    },

    // Process all cards played by all players
    recordTurn: function(data) {
        if (Enable_Logging) console.log("PYTHIA: cards played - I got", data);

        // Input check
        if (!data || !data.args || !data.args.cards) {
            return;
        } 

        var warPlayed = false;

        // Cycle all played cards
        for (var cardId in data.args.cards) {
            const playedCard = data.args.cards[cardId];
            const originalCard = this.game.card_types[playedCard.type];
            const player = playedCard.location_arg;
            if (!originalCard.category) return; // Input check
            const cardCategory = originalCard.category;

            // Track if played card was military
            if (cardCategory == "mil") {
                if (!originalCard.shield) return; // Input check
                warPlayed = true;
                this.players[player].shields += originalCard.shield;
            }

            // Update played cards array of the player
            this.players[player].playedCards[cardCategory] += 1;

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

        // Input check
        if (!data || !data.args || !data.args.coinddelta) {
            return;
        } 

        this.players[data.args.player_id].coins += data.args.coinddelta;
    },

    // If main player discarded - we know what card it was
    recordDiscard: function(data) {
        if (Enable_Logging) console.log("PYTHIA: card discarded - I got", data);

        // Input check
        if (!data || !data.args || !data.args.card_id || !!data.channelorig) {
            return;
        } 

        var player = data.channelorig.substring(9);
        delete this.players[player].hand[data.args.card_id];
    },

    // If Rhodos built a stage - it could have shields
    recordWonderStage: function(data) {
        if (Enable_Logging) console.log("PYTHIA: wonder built - I got", data);

        // Input check
        if (!data || !data.args || !data.args.step || !data.args.player_id) {
            return;
        } 

        const playerId = data.args.player_id;
        const stage = data.args.step;
        const wonderId = this.players[playerId].wonder;

        this.players[playerId].wonderStages += 1; // increase a counter of built wonder stages
        if (this.game.wonders[wonderId].stages[stage].shield) {
            this.players[playerId].shields += this.game.wonders[wonderId].stages[stage].shield;
            this.calculateWarScores();
        }
    },

    // Record which wonder each player has chosen
    recordWonderChoice: function(data) {
        if (Enable_Logging) console.log("PYTHIA: wonders chosen - I got", data);

        // Input check
        if (!data || !data.args || !data.args.wonders) {
            return;
        } 

        const wonders = Object.keys(data.args.wonders);
        for (const playerId of wonders) {
            this.players[playerId].wonder = data.args.wonders[playerId];
        }
    },

    // Update internal scores as well
    recordScoreUpdate: function(data) {
        if (Enable_Logging) console.log("PYTHIA: scores updated - I got", data);

        // Input check
        if (!data || !data.args || !data.args.scores) {
            return;
        } 

        const scores = Object.keys(data.args.scores);
        for (const playerId of scores) {
            this.players[playerId].bgaScore = data.args.scores[playerId];
            this.renderPlayerScore(playerId);
        }
    },

    // If this is the last war - do cleanup
    recordWarResults: function(data) {
        if (Enable_Logging) console.log("PYTHIA: war battle happened - I got", data);

        // Input check
        if (!data || !data.args || !data.args.points || !data.args.neighbour_id) {
            return;
        } 

        // Save defeat tokens
        if (data.args.points > 0) {
            this.players[data.args.neighbour_id].defeats += 1;
        }

        if (this.currentAge == 3) {
            // Hide Pythia scores
            this.dojo.query("." + Player_Score_Span_Class).style("display", "none");

            // Remove Pythia leader & runnerup notation
            this.dojo.query("." + Player_Leader_Class + ", ." + Player_Runnerup_Class)
                .removeClass([Player_Leader_Class, Player_Runnerup_Class]);
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

        this.currentAge += 1;

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
        this.dojo.query("." + Player_Cards_Div_Class).forEach(this.dojo.empty);
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
        var direction = this.currentAge == 2 ? "right" : "left";
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
                "<span id='" + Player_Score_Id_Prefix + playerId + "'" +
                "class='player_score_value " + Player_Score_Span_Class + "'></span>",
                BGA_Player_Score_Id_Prefix + playerId,
                "after");
        }

        // Skip card container for main player and if already rendered
        if (playerId == this.mainPlayer || this.dojo.byId(Player_Cards_Id_Prefix + playerId)) {
            return;
        }
        // Insert card container
        this.dojo.place("<div id='" + Player_Cards_Id_Prefix + playerId + "'" +
            " class='" + Player_Cards_Div_Class + "'" +
            " style='height: " + CSS_Player_Cards_Div_Height + ";'></div>",
            BGA_Player_Board_Id_Prefix + playerId,
            "first");
    },

    // Render player hands
    renderPlayerCards: function() {
        const keys = Object.keys(this.players);
        for (const playerId of keys) {
            if (playerId == this.mainPlayer || isObjectEmpty(this.players[playerId].hand)) {
                continue;
            }

            var cardsHTML = "";
            var left = 7;
            for (var card in this.players[playerId].hand) {
                var playedCard = this.game.card_types[this.players[playerId].hand[card].type];
                var posX = -playedCard.backx;
                var posY = -playedCard.backy;
                cardsHTML +=
                    "<div class='stockitem  stockitem_unselectable'" +
                    "style='zoom: " + CSS_Player_Card_Zoom + "; background-position: " + posX + "px " + posY + "px;" +
                    "top: 25px; left: " + left + "px; width: " + CSS_Player_Card_Width + "; height: " + CSS_Player_Card_Height + ";" +
                    " background-image: url(" + Cards_Image + "); opacity: 1; border-width: 0px;'>";

                cardsHTML += "<span style='position: absolute; top: " + CSS_Player_Card_Title_Top +
                    "; font-size: " + CSS_Player_Card_Title_Font_Size +
                    "; color: " + CSS_Player_Card_Title_Font_Color + ";'>" + playedCard.nametr + "</span></div>";

                left += parseInt(CSS_Player_Card_Width) + 2;
            }
            this.dojo.place(cardsHTML, Player_Cards_Id_Prefix + playerId, "only");
        }
    },

    // Update total player score
    renderPlayerScore: function(playerId, score = 0) {
        var playerScore = this.dojo.byId(Player_Score_Id_Prefix + playerId);
        if (playerScore) {
            const totalScore = this.players[playerId].bgaScore + this.players[playerId].warScore;
            playerScore.innerHTML = " (" + totalScore + ")";
        }
    },

    // Add border and position of leader and runnerup players
    renderLeaderRunnerup: function() {
        if (!this.settings.enableLeaderRunnerupPositions) {
            return;
        }

        // Clean previous leader & runnerup
        this.dojo.query("." + Player_Leader_Class + ", ." + Player_Runnerup_Class)
            .removeClass([Player_Leader_Class, Player_Runnerup_Class]);

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

    // Add laurel wreath and coins icons on top of the card container
    renderCardPoints: function(cardId, pointsWorth = null, coinsWorth = null) {
        // Leave if card has no worth info
        if (pointsWorth === null && coinsWorth === null) {
            return;
        }

        // Clean up previous worth in case we saw this card already
        const containerId = Card_Worth_Id_Prefix + cardId;
        this.dojo.destroy(containerId);

        // Build HTML 
        const displayStyle = this.settings.enableCardPoints ? "block" : "none";
        var html = "<span id='" + containerId + "' class='" + Card_Worth_Class + "' style='display:" + displayStyle + ";'>";
        if (coinsWorth !== null) {
            html += "<img class='" + Card_Worth_Coins_Class + "' src='" + Coins_Image[coinsWorth] + "' />";
        }
        if (pointsWorth !== null) {
            html += "<img src='" + Victory_Points_Image[pointsWorth] + "' />";
        }
        html += "</span>";

        this.dojo.place(html, "cardmenu_" + cardId, "after");
    },

    // Render Pythia menu
    renderPythiaMenu: function() {
        var menuHtml = "<div id='pythia_menu'>";
        menuHtml += "<div class='menu_header'><h3>PYTHIA</h3></div>";

        // Player cards setting
        menuHtml += "<div id='pythia_menu_playercards' class='menu_item'><span class='title'>Player Cards:</span>";
        menuHtml += "<span class='status'>Enabled</span><button type='button'>Disable</button></div>";

        // War scores setting
        menuHtml += "<div id='pythia_menu_warscores' class='menu_item'><span class='title'>War Scores:</span>";
        menuHtml += "<span class='status'>Enabled</span><button type='button'>Disable</button></div>";

        // Leader Runnerup setting
        menuHtml += "<div id='pythia_menu_leaderrunnerup' class='menu_item'><span class='title'>Leader Runnerup:</span>";
        menuHtml += "<span class='status'>Enabled</span><button type='button'>Disable</button></div>";

        // Card Points setting
        menuHtml += "<div id='pythia_menu_cardpoints' class='menu_item'><span class='title'>Cards Worth:</span>";
        menuHtml += "<span class='status'>Enabled</span><button type='button'>Disable</button></div>";

        menuHtml += "</div>";
        this.dojo.place(menuHtml, "sevenwonder_wrap", "last");

        // Set correct texts based on settings
        this.togglePythiaSettingText("pythia_menu_playercards", this.settings.enableRecordCards);
        this.togglePythiaSettingText("pythia_menu_warscores", this.settings.enableWarScores);
        this.togglePythiaSettingText("pythia_menu_leaderrunnerup", this.settings.enableLeaderRunnerupPositions);
        this.togglePythiaSettingText("pythia_menu_cardpoints", this.settings.enableCardPoints);

        // Connect event handlers
        this.dojo.connect(this.dojo.query("button", "pythia_menu_playercards")[0], "onclick", this, "togglePythiaSettingPlayerCards");
        this.dojo.connect(this.dojo.query("button", "pythia_menu_warscores")[0], "onclick", this, "togglePythiaSettingWarScores");
        this.dojo.connect(this.dojo.query("button", "pythia_menu_leaderrunnerup")[0], "onclick", this, "togglePythiaSettingLeaderRunnerup");
        this.dojo.connect(this.dojo.query("button", "pythia_menu_cardpoints")[0], "onclick", this, "togglePythiaSettingCardPoints");
    },

    // Enable or disable display of cards in player hands
    togglePythiaSettingPlayerCards: function(event) {
        this.settings.enableRecordCards = !this.settings.enableRecordCards;
        localStorage.setItem('pythia-seetings-recordcards', this.settings.enableRecordCards);
        this.togglePythiaSettingPlayerCardsDisplay(this.settings.enableRecordCards);
        this.togglePythiaSettingText(event.target.parentNode.id, this.settings.enableRecordCards);
    },
    togglePythiaSettingPlayerCardsDisplay: function(pleaseShow) {
        if (pleaseShow) {
            this.dojo.query("." + Player_Cards_Div_Class).style("display", "block");
            this.dojo.query(".sw_coins", "boardspaces").addClass('pythia_enabled');
        } else {
            this.dojo.query("." + Player_Cards_Div_Class).style("display", "none");
            this.dojo.query(".sw_coins", "boardspaces").removeClass('pythia_enabled');
        }
    },

    // Enable or disable display of war scores
    togglePythiaSettingWarScores: function(event) {
        this.settings.enableWarScores = !this.settings.enableWarScores;
        localStorage.setItem('pythia-seetings-warscores', this.settings.enableWarScores);
        this.togglePythiaSettingWarScoresDisplay(this.settings.enableWarScores);
        this.togglePythiaSettingText(event.target.parentNode.id, this.settings.enableWarScores);
    },
    togglePythiaSettingWarScoresDisplay: function(pleaseShow) {
        if (pleaseShow) {
            this.dojo.query("." + Player_Score_Span_Class).style("display", "inline");
        } else {
            this.dojo.query("." + Player_Score_Span_Class).style("display", "none");
        }
    },

    // Enable or disable display of leader and runnerup positions
    togglePythiaSettingLeaderRunnerup: function(event) {
        this.settings.enableLeaderRunnerupPositions = !this.settings.enableLeaderRunnerupPositions;
        localStorage.setItem('pythia-seetings-leaderrunnerup', this.settings.enableLeaderRunnerupPositions);
        this.togglePythiaSettingLeaderRunnerupDisplay(this.settings.enableLeaderRunnerupPositions);
        this.togglePythiaSettingText(event.target.parentNode.id, this.settings.enableLeaderRunnerupPositions);
    },
    togglePythiaSettingLeaderRunnerupDisplay: function(pleaseShow) {
        if (pleaseShow) {
            this.renderLeaderRunnerup();
        } else {
            this.dojo.query("." + Player_Leader_Class + ", ." + Player_Runnerup_Class)
                .removeClass([Player_Leader_Class, Player_Runnerup_Class]);
        }
    },

    // Enable or disable display of cards points worth
    togglePythiaSettingCardPoints: function(event) {
        this.settings.enableCardPoints = !this.settings.enableCardPoints;
        localStorage.setItem('pythia-seetings-cardpoints', this.settings.enableCardPoints);
        this.togglePythiaSettingCardPointsDisplay(this.settings.enableCardPoints);
        this.togglePythiaSettingText(event.target.parentNode.id, this.settings.enableCardPoints);
    },
    togglePythiaSettingCardPointsDisplay: function(pleaseShow) {
        if (pleaseShow) {
            this.dojo.query("." + Card_Worth_Class).style("display", "block");
        } else {
            this.dojo.query("." + Card_Worth_Class).style("display", "none");
        }
    },

    // Switch enable/disable text in Pythia settings
    togglePythiaSettingText: function(parentId, isEnabled) {
        if (isEnabled) {
            this.dojo.query(".status", parentId)
                .addClass('enabled')
                .removeClass('disabled')[0]
                .innerHTML = "Enabled";
            this.dojo.query("button", parentId)[0].innerHTML = "Disable";
        } else {
            this.dojo.query(".status", parentId)
                .addClass('disabled')
                .removeClass('enabled')[0]
                .innerHTML = "Disabled";
            this.dojo.query("button", parentId)[0].innerHTML = "Enable";
        }
    },

    // Is this the first turn of the age?
    isFirstTurn: function() {
        return isObjectEmpty(this.players[this.mainPlayer].hand);
    },

    // Set Pythia CSS styles
    setStyles: function() {
        this.dojo.place(
            "<style type='text/css' id='Pythia_Styles'>" +
            ".sw_coins.pythia_enabled { top: 50px; } " +
            "#player_board_wrap_" + this.mainPlayer + " .sw_coins { top: 0px; } " +
            "#player_hand_wrap { padding-top: 52px; } " +
            "#pythia_menu { position: absolute; top: 10px; right: 50px; } " +
            "#pythia_menu .menu_header { margin-bottom: 5px; } " +
            "#pythia_menu .menu_header h3 { display: inline; } " +
            "#pythia_menu .menu_item { height: 23px; } " +
            "#pythia_menu .menu_item span.title { width: 140px; display: inline-block;} " +
            "#pythia_menu .menu_item span.status { text-align: center; width: 60px; display: inline-block; } " +
            "#pythia_menu .menu_item span.status.enabled { color: green; } " +
            "#pythia_menu .menu_item span.status.disabled { color: red; } " +
            "#pythia_menu .menu_item button { width: 60px; padding: 3px; border-radius: 5px; margin-left: 10px; } " +
            "." + Player_Leader_Class + " { border: 5px solid green; } " +
            "." + Player_Leader_Class + " h3::before { content: '(Leader) '; color: green; float: left; margin-top: -4px; white-space: pre; }" +
            "." + Player_Runnerup_Class + " { border: 5px solid red; } " +
            "." + Player_Runnerup_Class + " h3::before { content: '(Runner up) '; color: red; float: left; margin-top: -4px; white-space: pre; }" +
            "." + Card_Worth_Class + " { position: absolute; top: -53px; left: 6px; width: 128px; text-align: center; }" +
            "." + Card_Worth_Class + " img { zoom: 0.09; }" +
            "." + Card_Worth_Class + " img." + Card_Worth_Coins_Class + " { position: relative; top: -35px; }" +
            "</style>", "sevenwonder_wrap", "last");
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
        if (!window.parent || !window.parent.gameui || !window.parent.gameui.game_name
            || window.parent.gameui.game_name != "sevenwonders") {
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
