'use strict';

const MainLoop = require('./mainloop');
const Player = require('../Player');
const Vector = require('../lib/vector');
const fixedNumber = require('../lib/fixed-number');

const NETWORK_FPS = 45;
const PHYSICS_FPS = 66;

var game_core = function(game_instance){
    // Store the instance, if any
    this.instance = game_instance;

    // Used in collision etc.
    this.world = {
        width: 720,
        height: 480
    };

    // We create a player set, passing them
    // the game that is running them, as well
    this.players = {
        self: new Player(this, this.instance.player_host),
        other: new Player(this, this.instance.player_client)
    };

    this.players.self.pos = { x: 20, y: 20 };

    // The speed at which the clients move.
    this.playerspeed = 120;

    // A local timer for precision on server
    this.local_time = PHYSICS_FPS / 1000 / 1000;

    this.server_time = 0;
    this.laststate = {};
};

game_core.prototype.check_collision = function( item ) {
    // Left wall.
    if (item.pos.x <= item.pos_limits.x_min) {
        item.pos.x = item.pos_limits.x_min;
    }

    // Right wall
    if (item.pos.x >= item.pos_limits.x_max) {
        item.pos.x = item.pos_limits.x_max;
    }

    // Roof wall.
    if (item.pos.y <= item.pos_limits.y_min) {
        item.pos.y = item.pos_limits.y_min;
    }

    // Floor wall
    if (item.pos.y >= item.pos_limits.y_max) {
        item.pos.y = item.pos_limits.y_max;
    }

    // Fixed point helps be more deterministic
    item.pos.x = fixedNumber(item.pos.x, 4);
    item.pos.y = fixedNumber(item.pos.y, 4);
};

game_core.prototype.process_input = function (player, delta) {
    let x_dir = 0;
    let y_dir = 0;
    const ic = player.inputs.length;

    if (ic) {
        for (let j = 0; j < ic; ++j) {
            // don't process ones we already have simulated locally
            if(player.inputs[j].seq > player.last_input_seq) {

                const input = player.inputs[j].inputs;
                const c = input.length;

                for (let i = 0; i < c; ++i) {
                    const key = input[i];

                    if (key === 'l') {
                        x_dir -= 1;
                    }
                    if (key === 'r') {
                        x_dir += 1;
                    }
                    if (key === 'd') {
                        y_dir += 1;
                    }
                    if (key === 'u') {
                        y_dir -= 1;
                    }
                }
            }
        }
    }

    // we have a direction vector now, so apply the same physics as the client
    const resulting_vector = this.physics_movement_vector_from_direction(x_dir, y_dir, delta);

    if (player.inputs.length) {
        // we can now clear the array since these have been processed
        player.last_input_time = player.inputs[ic - 1].time;
        player.last_input_seq = player.inputs[ic - 1].seq;
    }

    return resulting_vector;
};

game_core.prototype.physics_movement_vector_from_direction = function(x, y, delta) {
    return {
        x: fixedNumber(x * (this.playerspeed * (delta / 1000)), 3),
        y: fixedNumber(y * (this.playerspeed * (delta / 1000)), 3)
    };
};

//Updated at 15ms , simulates the world state
game_core.prototype.server_update_physics = function (delta) {
    // Handle player one
    this.players.self.old_state.pos = Vector.copy(this.players.self.pos);
    var new_dir = this.process_input(this.players.self, delta);

    this.players.self.pos = Vector.add(this.players.self.old_state.pos, new_dir);

    // Handle player two
    this.players.other.old_state.pos = Vector.copy(this.players.other.pos);
    var other_new_dir = this.process_input(this.players.other, delta);
    this.players.other.pos = Vector.add(this.players.other.old_state.pos, other_new_dir);

    //Keep the physics position in the world
    this.check_collision( this.players.self );
    this.check_collision( this.players.other );

    this.players.self.inputs = []; //we have cleared the input buffer, so remove this
    this.players.other.inputs = []; //we have cleared the input buffer, so remove this
};

//Makes sure things run smoothly and notifies clients of changes
//on the server side
game_core.prototype.server_update = function(){

    //Update the state of our local clock to match the timer
    this.server_time = this.local_time;

    //Make a snapshot of the current state, for updating the clients
    this.laststate = {
        hp: this.players.self.pos,                //'host position', the game creators position
        cp: this.players.other.pos,               //'client position', the person that joined, their position
        his: this.players.self.last_input_seq,     //'host input sequence', the last input we processed for the host
        cis: this.players.other.last_input_seq,    //'client input sequence', the last input we processed for the client
        t: this.server_time                      // our current local time on the server
    };

    // Send the snapshot to the 'host' player
    if(this.players.self.instance) {
        this.players.self.instance.emit( 'onserverupdate', this.laststate );
    }

    // Send the snapshot to the 'client' player
    if (this.players.other.instance) {
        this.players.other.instance.emit('onserverupdate', this.laststate);
    }
};

game_core.prototype.handle_server_input = function(client, input, input_time, input_seq) {

    // Fetch which client this refers to out of the two
    var player_client = (client.userid == this.players.self.instance.userid) ? this.players.self : this.players.other;

    // Store the input on the player instance for processing in the physics loop
    player_client.inputs.push({inputs:input, time:input_time, seq:input_seq});
};

class GameCore extends game_core {
    constructor (...args) {
        super(...args);

        const updateNetwork = () => {
            this.server_update();
        };

        this._physicsLoop = MainLoop.create().setSimulationTimestep(1000 / PHYSICS_FPS).setUpdate((delta) => {
            this.server_update_physics(delta);
            this.local_time += delta / 1000;
        });

        this._networkLoop = MainLoop.create().setSimulationTimestep(1000 / NETWORK_FPS).setUpdate(updateNetwork);
    }

    start () {
        this._physicsLoop.start();

        this._networkLoop.start();
    }

    stop () {
        this._physicsLoop.stop();
        this._networkLoop.stop();
    }
}

module.exports = GameCore;
