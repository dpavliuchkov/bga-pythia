// ==UserScript==
// @name         Colonist Pythia game helper
// @description  Visual aid that extends Colonist game interface with useful information
// @namespace    https://github.com/dpavliuchkov/colonist
// @author       https://github.com/dpavliuchkov
// @version      1.1.0
// @license      MIT
// @include      *colonist.io/*
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://code.jquery.com/ui/1.13.2/jquery-ui.js
// @grant        none
// ==/UserScript==
const Enable_Logging = false;

// Main Pythia object
var pythia = {
    isStarted: false,
    isFinished: false,
    isPlayersReordered: false,
    players: [],
    mainPlayer: "",
    previousLog: "",

    // Init Pythia
    init: function() {
        this.isStarted = true;
        this.mainPlayer = document.getElementById("header_profile_username").innerHTML;

        $(document).on('DOMNodeInserted', function(e) {
            if (e.target.className == "message_post") {
                this.defaultView.pythia.parseLog(e.target);
            }
        });

        this.setStyles();
        this.renderContainers();

        if (Enable_Logging) console.log("PYTHIA: My eyes can see everything!");
        return this;
    },

    // Record new scores
    parseLog: function(node) {
        if (Enable_Logging) console.log("PYTHIA: new log to parse - I got", node);

        try {
            // Avoid duplicate calls in a row
            if (this.previousLog == node.innerHTML) {
                return;
            }
            this.previousLog = node.innerHTML;

            if (node.childNodes.length == 1) return;

            // Traverse childNodes
            const parts = node.childNodes;
            const partsKeys = Object.keys(parts);

            // Add player if we haven't seen them before
            if (!parts[1].nodeValue) {
                return;
            }
            const info = parts[1].nodeValue.split(" ");
            const playerName = info[0].replace('#', '').trim();
            this.addPlayer(playerName, node.style.color);

            const action = info[1].replace(':', '').trim();

            // Helper variables
            var source, destinationPart, bankPart, monopolyCount;

            switch (action) {
                case "placed":
                    break;
                case "used":
                    break;
                case "moved":
                    break;
                case "wants":
                    break;
                case "is":
                    break;
                case "has":
                    break;

                // Reorder player containers to mathc player order
                case "rolled":
                    var lastPlayer;
                    debugger;
                    while (!this.isPlayersReordered) {
                        lastPlayer = $("#pythia-container div:last-child");
                        if (lastPlayer.hasClass("pythia-mainplayer")) {
                            this.isPlayersReordered = true;
                        } else {
                            $("#pythia-container").prepend(lastPlayer);
                        }
                    }
                    break;

                case "got":
                case "received":
                    // Add new resources
                    for (const partId of partsKeys) {
                        if (partId < 2) continue;
                        this.addResource(playerName, parts[partId].alt);
                    }
                    break;

                case "built":
                    // Player paid for something
                    if (parts[2].alt == "road") {
                        this.removeResource(playerName, "lumber");
                        this.removeResource(playerName, "brick");
                    }
                    if (parts[2].alt == "settlement") {
                        this.removeResource(playerName, "lumber");
                        this.removeResource(playerName, "brick");
                        this.removeResource(playerName, "wool");
                        this.removeResource(playerName, "grain");
                    }
                    if (parts[2].alt == "city") {
                        this.removeResource(playerName, "grain");
                        this.removeResource(playerName, "grain");
                        this.removeResource(playerName, "ore");
                        this.removeResource(playerName, "ore");
                        this.removeResource(playerName, "ore");
                    }
                    break;

                case "bought":
                    // Player bought a development card
                    this.removeResource(playerName, "wool");
                    this.removeResource(playerName, "grain");
                    this.removeResource(playerName, "ore");
                    break;

                case "discarded":
                    // Player needs to discard
                    for (const partId of partsKeys) {
                        if (partId < 2) continue;

                        this.removeResource(playerName, parts[partId].alt);
                    }
                    break;

                case "took":
                    // 2 resources for free
                    for (const partId of partsKeys) {
                        if (partId < 2) continue;
                        this.addResource(playerName, parts[partId].alt);
                    }
                    break;

                    break;

                case "traded":
                    // Trade between 2 players
                    source = parts[parts.length - 1].textContent.replace('#', '').replace("with:", "").trim();
                    destinationPart = true;

                    for (const partId of partsKeys) {
                        if (partId < 2) continue;

                        if (parts[partId].nodeName == "#text") {
                            if (parts[partId].nodeValue.trim() == "for:") {
                                destinationPart = false;
                            }
                            continue;
                        }
                        if (destinationPart) {
                            this.removeResource(playerName, parts[partId].alt);
                            this.addResource(source, parts[partId].alt);
                        } else {
                            this.addResource(playerName, parts[partId].alt);
                            this.removeResource(source, parts[partId].alt);
                        }
                    }
                    break;

                case "gave":
                    // Trade with bank
                    bankPart = true;
                    for (const partId of partsKeys) {
                        if (partId < 2) continue;

                        if (parts[partId].nodeName == "#text" && parts[partId].nodeValue.trim() == "and took") {
                            bankPart = false;
                            continue;
                        }
                        if (bankPart) {
                            this.removeResource(playerName, parts[partId].alt);
                        } else {
                            this.addResource(playerName, parts[partId].alt);
                        }
                    }
                    break;

                case "stole":
                    // Monopoly
                    if (parts.length == 3) {
                        // Add resources
                        monopolyCount = parts[1].nodeValue.split(" ")[2].replace(":", "");
                        for (var i = 0; i < monopolyCount; i++) {
                            this.addResource(playerName, parts[2].alt);
                        }

                        // Remove resources from other players
                        for (const playerId of Object.keys(this.players)) {
                            if (playerId != playerName) {
                                this.resetResource(playerId, parts[2].alt);
                            }
                        }
                    }

                    // Robber
                    if (parts.length == 4) {
                        // Stolen by
                        if (parts[2].alt == "card") {
                            this.addResource(playerName, "any");
                        } else {
                            this.addResource(playerName, parts[2].alt);
                        }

                        // Stolen from
                        source = parts[3].textContent.replace('#', '').replace("from:", "").trim();
                        if (source == "from you") {
                            source = this.mainPlayer;
                        }
                        if (parts[2].alt == "card") {
                            this.removeResource(source, "stolen");
                        } else {
                            this.removeResource(source, parts[2].alt);
                        }

                    }
                    break;

                default:
                    // Did we miss a new action?
                    if (Enable_Logging) console.log("PYTHIA: I found a new action I don't know", action);
                    break;
            }

            // After we parse the log, update containers for all players
            for (const playerId of Object.keys(this.players)) {
                this.updatePlayerResources(playerId);
            }

        } catch (error) {
            console.error("PYTHIA ERROR:", error);
        }
    },

    // Add new palyer to the array
    addPlayer: function(name, color) {
        if (!name || ["Bot", "Reconnecting", "No", "Friendly", "Karma"].includes(name)) return;

        if (name.toLowerCase() == "you") {
            name = this.mainPlayer;
        }

        if (!(name in this.players)) {
            this.players[name] = {
                lumber: 0,
                brick: 0,
                grain: 0,
                wool: 0,
                ore: 0,
                any: 0, // any resource gain by the robber
                stolen: 0, // any resource lost to the robber
            };

            color = color.replace(")", "") + ", 0.5)";
            this.renderPlayerContainers(name, color);
            this.updatePlayerResources(name);
        }
    },

    // Add a resource to the player
    addResource: function(playerName, resource) {
        if (playerName.toLowerCase() == "you") {
            playerName = this.mainPlayer;
        }
        this.players[playerName][resource]++;
    },

    // Remove a resource from the player, respect unknown resources
    removeResource: function(playerName, resource) {
        if (playerName.toLowerCase() == "you") {
            playerName = this.mainPlayer;
        }
        const player = this.players[playerName];

        // Remove a common resource
        if (["lumber", "brick", "grain", "wool", "ore"].includes(resource)) {
            if (player[resource] == 0 && player["any"] > 0) {
                // If player stole before, then they just used the stolen resource
                player["any"]--;
            } else {
                player[resource]--;
            }
        }

        // Remove stolen resources
        if (resource == "stolen") {
            player[resource]--;
        }

        if (player["stolen"] < 0) {
            this.balanceStolenResources(playerName);
        }
    },

    // Balance robbed cards if possible
    balanceStolenResources: function(playerName) {
        if (playerName.toLowerCase() == "you") {
            playerName = this.mainPlayer;
        }
        const player = this.players[playerName];

        // Check if we are net zero across all resources
        const total = player["lumber"] + player["brick"] + player["grain"] + player["wool"] + player["ore"];
        if (total == 0 || (total + player["any"] + player["stolen"]) == 0) {
            player["any"] = 0;
            player["stolen"] = 0;
            player["lumber"] = 0;
            player["brick"] = 0;
            player["grain"] = 0;
            player["wool"] = 0;
            player["ore"] = 0;
        } else {
            // Check if only 1 resource is left, then it definitely was robbed
            var totalResourceTypes = 0;
            var singleResource = "";
            if (player["lumber"] > 0) {
                totalResourceTypes++;
                singleResource = "lumber";
            }
            if (player["brick"] > 0) {
                totalResourceTypes++;
                singleResource = "brick";
            }
            if (player["grain"] > 0) {
                totalResourceTypes++;
                singleResource = "grain";
            }
            if (player["wool"] > 0) {
                totalResourceTypes++;
                singleResource = "wool";
            }
            if (player["ore"] > 0) {
                totalResourceTypes++;
                singleResource = "ore";
            }
            if (player["any"] > 0) {
                totalResourceTypes++;
                singleResource = "any";
            }

            // We got a single resource left, it definitely was robbed!
            if (totalResourceTypes == 1) {
                player[singleResource] = player[singleResource] + player["stolen"];
                player["stolen"] = 0;
            }
        }
    },

    // Remove all resources of a particualr kind
    resetResource: function(playerName, resource) {
        if (playerName.toLowerCase() == "you") {
            playerName = this.mainPlayer;
        }
        this.players[playerName][resource] = 0;
    },

    // Render player containers
    renderPlayerContainers: function(playerName, color) {
        $("#pythia-container").append("<div id='pythia-" + playerName + "' style='background-color:" + color + "'></div>");

        if (playerName == this.mainPlayer) {
            $("#pythia-" + playerName).addClass("pythia-mainplayer");
        }
    },

    // Render player containers with new values
    updatePlayerResources: function(playerName) {
        $("#pythia-" + playerName).empty();
        $("#pythia-" + playerName).append("<span class='pythia-player-name'>" + playerName + "</span>");
        $("#pythia-" + playerName).append("<span class='pythia-player-resource'>" + this.players[playerName].lumber +
            "<img src='/dist/images/card_lumber.svg?v140' alt='lumber' height='30' width='20' class='lobby-chat-text-icon'></span>");
        $("#pythia-" + playerName).append("<span class='pythia-player-resource'>" + this.players[playerName].brick +
            "<img src='/dist/images/card_brick.svg?v140' alt='brick' height='30' width='20' class='lobby-chat-text-icon'></span>");
        $("#pythia-" + playerName).append("<span class='pythia-player-resource'>" + this.players[playerName].wool +
            "<img src='/dist/images/card_wool.svg?v140' alt='wool' height='30' width='20' class='lobby-chat-text-icon'></span>");
        $("#pythia-" + playerName).append("<span class='pythia-player-resource'>" + this.players[playerName].grain +
            "<img src='/dist/images/card_grain.svg?v140' alt='grain' height='30' width='20' class='lobby-chat-text-icon'></span>");
        $("#pythia-" + playerName).append("<span class='pythia-player-resource'>" + this.players[playerName].ore +
            "<img src='/dist/images/card_ore.svg?v140' alt='ore' height='30' width='20' class='lobby-chat-text-icon'></span>");
        $("#pythia-" + playerName).append("<span class='pythia-player-resource'>" + this.players[playerName].any +
            "<img src='/dist/images/card_rescardback.svg?v140' alt='card' height='30' width='20' class='lobby-chat-text-icon'></span>");
        $("#pythia-" + playerName).append("<span class='pythia-player-resource pythia-stolen'>" + this.players[playerName].stolen +
            "<img src='/dist/images/card_rescardback.svg?v140' alt='card' height='30' width='20' class='lobby-chat-text-icon'></span>");
    },

    // Render default Pythia containers
    renderContainers: function() {
        $(document.body).append("<div id='pythia-container'></div>");
        $("#pythia-container").draggable();
    },

    // Set Pythia CSS styles
    setStyles: function() {
        $(document.body).addClass("pythia_enabled");
        $(document.body).append(
            "<style type='text/css' id='Pythia_Styles'>" +
            "#pythia-container { position: absolute; z-index: 1; top: 10%; left: 10%; background-color: beige; }" +
            "#pythia-container { color: black; padding: 10px; font-size: 24px; }" +
            ".pythia-player-name { min-width: 150px; display: inline-block; }" +
            ".pythia-player-resource { margin-left: 10px; width: 55px; display: inline-block; text-align: right; }" +
            ".pythia-player-resource img { margin-left: 2px; margin-top: -3px; }" +
            ".pythia-stolen img { filter: invert(1); }" +
            ".in_game_ab_right, .in_game_ab_left { display: none ! important; }" +
            "</style>"
        );

        $(".main_container_block_ads_included").removeClass("main_container_block_ads_included");
    }
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Everything starts here
var onload = async function() {
    await sleep(1000); // Wait for Colonist to load

    var gameLoaded = document.getElementById('game-log-text');
    if (gameLoaded == null) {
        await sleep(1000); // Wait for Colonist to load
        onload();
    } else {

        // Prevent multiple launches
        if (window.parent.pythia && window.parent.pythia.isStarted) {
            return;
        } else {
            if (Enable_Logging) console.log("PYTHIA: I have come to serve you");
            window.parent.pythia = pythia.init();
        }
    }
};

if (document.readyState === "complete") {
    onload();
} else {
    (addEventListener || attachEvent).call(window, addEventListener ? "load" : "onload", onload);
}
