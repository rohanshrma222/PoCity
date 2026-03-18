"use client"
import dynamic from "next/dynamic"

const PhaserGame = dynamic(() => import("./PhaserGame"), {ssr: false});

export default function GameCanvas() {
    return <PhaserGame />;
}