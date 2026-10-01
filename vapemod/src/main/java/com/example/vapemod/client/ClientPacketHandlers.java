package com.example.vapemod.client;

import com.example.vapemod.network.SyncVapePacket;
import com.example.vapemod.network.VaporPacket;

/** Client-side packet handling (only ever called on the client, on the main thread). */
public final class ClientPacketHandlers {
    private ClientPacketHandlers() {}

    public static void handleSync(SyncVapePacket msg) {
        ClientVapeData.set(msg.level(), msg.totalPuffs());
    }

    public static void handleVapor(VaporPacket msg) {
        VaporEmitters.start(msg.entityId(), msg.strength(), msg.color());
    }
}
