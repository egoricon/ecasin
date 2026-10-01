package com.example.vapemod.network;

import com.example.vapemod.client.ClientPacketHandlers;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraftforge.event.network.CustomPayloadEvent;

/** Current vaping bar of the receiving player. */
public record SyncVapePacket(float level, int totalPuffs) {
    public static final StreamCodec<RegistryFriendlyByteBuf, SyncVapePacket> STREAM_CODEC =
            StreamCodec.ofMember(SyncVapePacket::encode, SyncVapePacket::decode);

    private static void encode(SyncVapePacket msg, RegistryFriendlyByteBuf buf) {
        buf.writeFloat(msg.level);
        buf.writeVarInt(msg.totalPuffs);
    }

    private static SyncVapePacket decode(RegistryFriendlyByteBuf buf) {
        return new SyncVapePacket(buf.readFloat(), buf.readVarInt());
    }

    public static void handle(SyncVapePacket msg, CustomPayloadEvent.Context ctx) {
        ClientPacketHandlers.handleSync(msg);
    }
}
