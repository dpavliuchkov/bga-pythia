// ==UserScript==
// @name         BGA Pythia - 7 Wonders Architects game helper
// @description  Visual aid that extends BGA game interface with useful information
// @namespace    https://github.com/dpavliuchkov/bga-pythia
// @author       https://github.com/dpavliuchkov
// @version      1.1.1
// @license      MIT
// @include      *boardgamearena.com/*
// @grant        none
// ==/UserScript==

// System variables - don't edit
const Enable_Logging = false;
const Is_Inside_Game = /\?table=[0-9]*/.test(window.location.href);
const BGA_Player_Score_Id_Prefix = "player_name_";
const BGA_Player_Scoreboard_Id_Prefix = "overall_player_board_";
const Player_Score_Id_Prefix = "pythia_score_";
const Player_Score_Span_Class = "pythia_score";
const Player_Leader_Class = "pythia_leader";
const Decor_Card_Id = 6;
const Decor_Points = 4;

// Main Pythia object
var pythia = {
    isStarted: false,
    isFinished: false,
    dojo: null,
    game: null,
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

        // Render needed containers
        const keys = Object.keys(this.game.players);
        for (const playerId of keys) {
            this.players[playerId] = {
                score : 0,
                hasDecor : false,
            };
            this.renderPythiaContainers(playerId);
        }

        this.setStyles();

        // Connect event handlers to follow game progress
        this.dojo.subscribe("updateScore", this, "recordScoreUpdate");
        this.dojo.subscribe("getProgress", this, "recordProgressToken");
        // this.dojo.subscribe("getCard", this, "recordGetCard");
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
        this.players[playerId] = { score : score };
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
    },

    // Record which progress a player got
    recordProgressToken: function(data) {
        if (Enable_Logging) console.log("PYTHIA: player took a progress token - I got", data);

        // Input check
        if (!data || !data.args || !data.args.progress) {
            return;
        }
        // Track progress tokens that give victory points
        const playerId = data.args.player_id;
        if (data.args.progress.type_arg == Decor_Card_Id) {
            this.players[playerId].hasDecor = true;
        }
    },

    // Record that the game has ended
    recordVictory: function(data) {
        if (Enable_Logging) console.log("PYTHIA: game has finished - I got", data);
        this.isFinished = true;
    },

    // Update total player score
    renderPlayerScore: function(playerId, score = 0) {
        var playerScore = this.dojo.byId(Player_Score_Id_Prefix + playerId);
        if (playerScore) {
            if (!this.isFinished) {
                if (this.players[playerId].hasDecor) {
                    score += Decor_Points;
                }
            }
            this.dojo.query("#" + Player_Score_Id_Prefix + playerId)[0]
              .innerHTML = "⭐" + score;
        }
    },

    // Add border and position of the leader player
    renderLeader: function() {
        // Clean previous leader
        this.dojo.query("." + Player_Leader_Class).removeClass(Player_Leader_Class);

        // Find leader
        var leaderId = null;
        var leaderScore = null;
        const keys = Object.keys(this.players);
        for (const playerId of keys) {
            if (this.players[playerId].score >= leaderScore) {
                leaderScore = this.players[playerId].score;
                leaderId = playerId;
            }
        }

        // Mark new leader
        this.dojo.addClass(BGA_Player_Scoreboard_Id_Prefix + leaderId, Player_Leader_Class);
    },

    // Render player containers
    renderPythiaContainers: function(playerId) {
        // Insert war score container in scores table
        if (!this.dojo.byId(Player_Score_Id_Prefix + playerId)) {
            this.dojo.place(
                "<span id='" + Player_Score_Id_Prefix + playerId + "'" +
                "class='player_score_value " + Player_Score_Span_Class + "'>⭐0</span>",
                BGA_Player_Score_Id_Prefix + playerId,
                "first");
        }
    },

    // Set Pythia CSS styles
    setStyles: function() {
        this.dojo.query("body").addClass("pythia_enabled");
        this.dojo.place(
            "<style type='text/css' id='Pythia_Styles'>" +
                "." + Player_Leader_Class + " .player_board_inner { border: 5px solid; border-color: green; border-radius> 10px; } " +
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
window.onload = async function() {
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
