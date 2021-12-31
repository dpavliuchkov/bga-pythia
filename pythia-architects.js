// ==UserScript==
// @name         BGA Pythia - 7 Wonders Architects game helper
// @description  Visual aid that extends BGA game interface with useful information
// @namespace    https://github.com/dpavliuchkov/bga-pythia
// @author       https://github.com/dpavliuchkov
// @version      1.2.3
// @license      MIT
// @include      *boardgamearena.com/*
// @grant        none
// ==/UserScript==

// System variables - don't edit
const Enable_Logging = false;
const Is_Inside_Game = /\?table=[0-9]*/.test(window.location.href);
const BGA_Player_Scoreboard_Id_Prefix = "overall_player_board_";
const BGA_Player_Score_Right_Id_Prefix = "player_name_";
const BGA_Player_Score_Main_Id_Prefix = "playerarea_";
const BGA_Progress_Id_Prefix = "pg_";
const Player_Score_Right_Id_Prefix = "pythia_score_right_";
const Player_Score_Main_Id_Prefix = "pythia_score_main_";
const Player_Score_Span_Class = "player_score_value";
const Player_Leader_Class = "pythia_leader";
const Progress_Worth_Class = "progress_worth";
const Cat_Card_Type_Id = 16;
const Politics_Progress_Type_Id = 2;
const Decor_Progress_Type_Id = 6;
const Strategy_Progress_Type_Id = 8;
const Education_Progress_Type_Id = 12;
const Culture_Progress_Type_Id = 13;
const Cat_Pawn_Type_Id = 17;
const Decor_Points = 4;

// progress tokens - type args
// 1 - science draw
// 2 - cat politics
// 3 - wood / clay
// 4 - ??
// 5 - double gold
// 6 - decor
// 7 - wonder stages
// 8 - victories
// 9 - two shields
// 10 - horns
// 11 - ??
// 12 - education
// 13 - culture
// 14 - engineering
// 15 - ??
// 16 - stone gold
// 17 - cat pawn

// big game https://boardgamearena.com/1/sevenwondersarchitects?table=227901083


// Main Pythia object
var pythia = {
    isStarted: false,
    isFinished: false,
    dojo: null,
    game: null,
    mainPlayerId: null,
    players: [],

    // Init Pythia
    init: function() {
        this.isStarted = true;
        // Check if the site was loaded correctly
        if (!window.parent || !window.parent.dojo || !window.parent.gameui.gamedatas) {
            return;
        }
        this.dojo = window.parent.dojo;
        this.game = window.parent.gameui.gamedatas;

        const playerOrder = this.game.playerorder;
        this.playersCount = playerOrder.length;
        this.mainPlayerId = playerOrder[0];

        // Prepare player objects and containers
        const keys = Object.keys(this.game.players);
        for (const playerId of keys) {
            this.players[playerId] = {
                score: 0,
                wonderStages: 0,
                totalCatCards: 0,
                totalWarVictories: 0,
                totalProgressTokens: 0,
                hasDecor: false,
                hasCulture: false,
            };
            this.renderPythiaContainers(playerId);
        }

        // Prepare progress tokens
        this.progressTokens = {};
        this.initProgressTokens();

        this.setStyles();

        // Connect event handlers to follow game progress
        this.dojo.subscribe("updateScore", this, "recordScoreUpdate");
        this.dojo.subscribe("getProgress", this, "recordProgressToken");
        this.dojo.subscribe("getCard", this, "recordGetCard");
        this.dojo.subscribe("flipWonderStage", this, "recordWonderStage");
        this.dojo.subscribe("conflictResult", this, "recordWarResult");
        this.dojo.subscribe("showProgress", this, "recordProgressShow");
        this.dojo.subscribe("victory", this, "recordVictory");

        if (Enable_Logging) console.log("PYTHIA: My eyes can see everything!");
        return this;
    },

    // Record new scores
    recordScoreUpdate: function(data) {
        if (Enable_Logging) console.log("PYTHIA: scores updated - I got", data);

        // Input check
        if (!data || !data.args) {
            return;
        }

        const playerId = data.args.player_id;
        const score = data.args.score;
        this.players[playerId].score = score;
        this.renderPlayerScore(playerId, score);
        this.renderLeader();
    },

    // Record which card a player got
    recordGetCard: function(data) {
        if (Enable_Logging) console.log("PYTHIA: player took a card - I got", data);

        // Input check
        if (!data || !data.args || !data.args.card) {
            return;
        }

        const playerId = data.args.player_id;
        var playerObjectChanged = false;

        // Increment if player drew a cat card
        if (data.args.card.type == Cat_Card_Type_Id) {
            this.players[playerId].totalCatCards++;
            playerObjectChanged = true;
        }

        // Update score values for progress tokens
        if (playerObjectChanged && playerId == this.mainPlayerId) {
            this.renderProgressWorth();
        }
    },

    // Record when a wonder stage was built
    recordWonderStage: function(data) {
        if (Enable_Logging) console.log("PYTHIA: wonder stage built - I got", data);

        // Input check
        if (!data || !data.args || !data.args.player_id) {
            return;
        }

        const playerId = data.args.player_id;
        this.players[playerId].wonderStages++; // increase a counter of built wonder stages
    },

    // Record which progress a player got
    recordProgressToken: function(data) {
        if (Enable_Logging) console.log("PYTHIA: player took a progress token - I got", data);

        // Input check
        if (!data || !data.args || !data.args.progress) {
            return;
        }

        // Skip movements of the cat pawn
        if (data.args.progress.type_arg == Cat_Pawn_Type_Id) {
            return;
        }

        const playerId = data.args.player_id;
        const token = data.args.progress;

        // Track progress tokens that can give victory points
        if (token.type_arg == Decor_Progress_Type_Id) {
            this.players[playerId].hasDecor = true;
        }
        if (token.type_arg == Culture_Progress_Type_Id) {
            this.players[playerId].hasCulture = true;
        }

        // Increment total progress tokens
        this.players[playerId].totalProgressTokens++;

        // Remove this token from the open list
        delete this.progressTokens[token.id];

        // Update score values for progress tokens
        if (playerId == this.mainPlayerId) {
            this.renderProgressWorth();
        }
    },

    // Record war results
    recordWarResult: function(data) {
        if (Enable_Logging) console.log("PYTHIA: war has ended - I got", data);

        // Input check
        if (!data || !data.args || !data.args.score) {
            return;
        }

        // Update who got military win tokens
        const warResults = data.args.score;
        for (const playerId in warResults) {
            this.players[playerId].totalWarVictories += warResults[playerId].length;
        }

        // Update score values for progress tokens
        this.renderProgressWorth();
    },

    // Record which new progress token was shown
    recordProgressShow: function(data) {
        if (Enable_Logging) console.log("PYTHIA: new progress token displayed - I got", data);

        // Input check
        if (!data || !data.args || !data.args.progress) {
            return;
        }

        // Add this token to the open list
        const token = data.args.progress;
        this.progressTokens[token.id] = token.type_arg;

        // Update score values for progress tokens
        this.renderProgressWorth();
    },

    // Record that the game has ended
    recordVictory: function(data) {
        if (Enable_Logging) console.log("PYTHIA: game has finished - I got", data);
        this.isFinished = true;
    },

    renderProgressWorth: function() {
        const mainPlayer = this.players[this.mainPlayerId];

        // Clean previous values
        this.dojo.query("." + Progress_Worth_Class).forEach(this.dojo.destroy);

        // Calculate progress worth in points
        for (var i in this.progressTokens) {
            const token = parseInt(this.progressTokens[i]);
            var pointsWorth = 0;

            switch (token) {
                case Politics_Progress_Type_Id:
                    pointsWorth = mainPlayer.totalCatCards;
                    break;

                case Decor_Progress_Type_Id:
                    pointsWorth = Decor_Points;
                    break;

                case Strategy_Progress_Type_Id:
                    pointsWorth = mainPlayer.totalWarVictories;
                    break;

                case Education_Progress_Type_Id:
                    pointsWorth = 2 + mainPlayer.totalProgressTokens * 2;
                    break;

                case Culture_Progress_Type_Id:
                    pointsWorth = 4;
                    if (mainPlayer.hasCulture) {
                        pointsWorth = 8;
                    }
                    break;
            }

            // Render progress worth
            var progressToken = this.dojo.byId(BGA_Progress_Id_Prefix + i);
            if (progressToken && !this.isFinished) {
                this.dojo.place(
                    "<span class='" + Progress_Worth_Class + "'>⭐" + pointsWorth + "</span>",
                    progressToken,
                    "first");
            }
        }
    },

    // Update total player score
    renderPlayerScore: function(playerId, score = 0) {
        var playerScore = this.dojo.byId(Player_Score_Main_Id_Prefix + playerId);
        if (playerScore) {
            if (!this.isFinished) {
                if (this.players[playerId].hasDecor) {
                    score += Decor_Points;
                }
            }
            this.dojo.query("#" + Player_Score_Main_Id_Prefix + playerId)[0]
                .innerHTML = "⭐" + score;
            this.dojo.query("#" + Player_Score_Right_Id_Prefix + playerId)[0]
                .innerHTML = "⭐" + score;
        }
    },

    // Add border and position of the leader player
    renderLeader: function() {
        // Clean previous leader
        this.dojo.query("." + Player_Leader_Class).removeClass(Player_Leader_Class);

        // Find leader
        var totalScores = [];
        const keys = Object.keys(this.players);
        for (const playerId of keys) {
            totalScores.push(
                [playerId,
                    this.players[playerId].score,
                    this.players[playerId].wonderStages
                ]);
        }
        totalScores.sort(function(a, b) {
            return b[1] - a[1] || b[2] - a[2];;
        });

        // Mark new leader
        this.dojo.addClass(BGA_Player_Scoreboard_Id_Prefix + totalScores[0][0], Player_Leader_Class);
        this.dojo.addClass(BGA_Player_Score_Main_Id_Prefix + totalScores[0][0], Player_Leader_Class);
    },

    // Render player containers
    renderPythiaContainers: function(playerId) {
        // Insert war score container in scores table
        if (!this.dojo.byId(Player_Score_Main_Id_Prefix + playerId)) {
            const mainPlayerArea = this.dojo.query("#" + BGA_Player_Score_Main_Id_Prefix + playerId + " .stw_name_holder");
            this.dojo.place(
                "<span id='" + Player_Score_Main_Id_Prefix + playerId + "'" +
                "class='" + Player_Score_Span_Class + "'>⭐0</span>",
                mainPlayerArea[0],
                "first");

            this.dojo.place(
                "<span id='" + Player_Score_Right_Id_Prefix + playerId + "'" +
                "class='" + Player_Score_Span_Class + "'>⭐0</span>",
                BGA_Player_Score_Right_Id_Prefix + playerId,
                "first");
        }
    },

    initProgressTokens: function() {
        const tokens = this.dojo.query("#science .progress");
        for (var i in tokens) {
            const token = tokens[i];
            if (!token.style || !token.id) {
                continue;
            }

            const tokenId = parseInt(token.id.substr(3));
            if (tokenId == 0) {
                continue;
            }

            // Calculate token background - to find which token is displayed
            const posX = Math.abs(parseInt(token.style.backgroundPositionX) / 100);
            const posY = Math.abs(parseInt(token.style.backgroundPositionY) / 100);

            // Relevant tokens
            if (posY == 0 && posX == 2) {
                this.progressTokens[tokenId] = Politics_Progress_Type_Id;
                continue;
            }
            if (posY == 1 && posX == 2) {
                this.progressTokens[tokenId] = Decor_Progress_Type_Id;
                continue;
            }
            if (posY == 2 && posX == 0) {
                this.progressTokens[tokenId] = Strategy_Progress_Type_Id;
                continue;
            }
            if (posY == 3 && posX == 0) {
                this.progressTokens[tokenId] = Education_Progress_Type_Id;
                continue;
            }
            if (posY == 3 && posX == 1) {
                this.progressTokens[tokenId] = Culture_Progress_Type_Id;
                continue;
            }
            // Not relevant token
            this.progressTokens[tokenId] = 0;
        }

        this.renderProgressWorth();
    },

    // Set Pythia CSS styles
    setStyles: function() {
        this.dojo.query("body").addClass("pythia_enabled");
        this.dojo.place(
            "<style type='text/css' id='Pythia_Styles'>" +
            "." + Player_Leader_Class + " .player_board_inner { border: 3px solid; border-color: green; border-radius: 10px; } " +
            "." + Player_Leader_Class + " .stw_name_holder { background-color: green; border-radius: 5px; color: white; } " +
            ".stw_name_holder ." + Player_Score_Span_Class + " { margin-right: 10px; margin-top: -6px; } " +
            "#science ." + Progress_Worth_Class + "  { display: block; position: relative; top: -32px; left: 25%; height: 25px; width: 34px; background: #F5EDE6; padding-left: 4px; padding-bottom: 3px; border-radius: 10px; } " +
            "</style>", "game_play_area_wrap", "last");
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

// Everything starts here
var onload = async function() {
    if (Is_Inside_Game) {
        await sleep(3000); // Wait for BGA to load dojo and 7W scripts
        if (!window.parent || !window.parent.gameui || !window.parent.gameui.game_name ||
            window.parent.gameui.game_name != "sevenwondersarchitects") {
            return;
        }

        // Prevent multiple launches
        if (window.parent.isPythiaStarted) {
            return;
        } else {
            if (Enable_Logging) console.log("PYTHIA: I have come to serve you");
            window.parent.isPythiaStarted = true;
            window.parent.pythia = pythia.init();
        }
    }
};

if (document.readyState === "complete") {
    onload();
} else {
    (addEventListener || attachEvent).call(window, addEventListener ? "load" : "onload", onload);
}
