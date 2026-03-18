"use client";
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { io, Socket } from "socket.io-client";

class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private socket!: Socket;
  private otherPlayers: Record<string, Phaser.GameObjects.Sprite> = {};

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    // placeholder — replace with real sprite sheet later
  }

  create() {
    // create player texture
    const graphics = this.add.graphics();
    graphics.fillStyle(0x4f46e5);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture("player", 32, 32);
    graphics.destroy();

    // local player
    this.player = this.physics.add.sprite(400, 300, "player");
    this.player.setCollideWorldBounds(true);
    this.cursors = this.input.keyboard!.createCursorKeys();

    // camera follows local player
    this.cameras.main.startFollow(this.player);

    // --- Socket.io ---
    this.socket = io("http://localhost:3001");

    this.socket.emit("player:join", {
      name: "Player1",
      x: 400,
      y: 300,
    });

    // render all existing players when first joining
    this.socket.on("players:init", (players: any[]) => {
      players.forEach((p) => {
        if (p.id !== this.socket.id) {
          this.addOtherPlayer(p);
        }
      });
    });

    // a new player joined the room
    this.socket.on("player:joined", (p: { id: string; x: number; y: number }) => {
      this.addOtherPlayer(p);
    });

    // another player moved
    this.socket.on("player:moved", ({ id, x, y }: { id: string; x: number; y: number }) => {
      this.otherPlayers[id]?.setPosition(x, y);
    });

    // a player left
    this.socket.on("player:left", (id: string) => {
      this.otherPlayers[id]?.destroy();
      delete this.otherPlayers[id];
    });
  }

  addOtherPlayer(p: { id: string; x: number; y: number }) {
    // other players rendered in red to distinguish from local player
    this.otherPlayers[p.id] = this.add
      .sprite(p.x, p.y, "player")
      .setTint(0xe11d48);
  }

  update() {
    const speed = 160;
    this.player.setVelocity(0);

    if (this.cursors.left.isDown)  this.player.setVelocityX(-speed);
    if (this.cursors.right.isDown) this.player.setVelocityX(speed);
    if (this.cursors.up.isDown)    this.player.setVelocityY(-speed);
    if (this.cursors.down.isDown)  this.player.setVelocityY(speed);

    // emit position every frame
    this.socket?.emit("player:move", {
      x: this.player.x,
      y: this.player.y,
    });
  }

  // clean up socket on scene shutdown
  shutdown() {
    this.socket?.disconnect();
  }
}

export default function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      physics: {
        default: "arcade",
        arcade: { gravity: { x: 0, y: 0 } },
      },
      scene: [GameScene],
      parent: "game-container",
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div id="game-container" className="w-full h-screen" />;
}