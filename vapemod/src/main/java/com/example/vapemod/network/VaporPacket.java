package com.example.vapemod.network;

import com.example.vapemod.client.ClientPacketHandlers;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraftforge.event.network.CustomPayloadEvent;

/**
 * Sent at the moment a player releases right click (exhale) to that player and everyone tracking them.
 * strength is 0..1 (puff length / max puff length), color is the liquid colour (RGB).
 */
public record VaporPacket(int entityId, float strength, int color) {
    public static final StreamCodec<RegistryFriendlyByteBuf, VaporPacket> STREAM_CODEC =
            StreamCodec.ofMember(VaporPacket::encode, VaporPacket::decode);

    private static void encode(VaporPacket msg, RegistryFriendlyByteBuf buf) {
        buf.writeVarInt(msg.entityId);
        buf.writeFloat(msg.strength);
        buf.writeInt(msg.color);
    }

    private static VaporPacket decode(RegistryFriendlyByteBuf buf) {
        return new VaporPacket(buf.readVarInt(), buf.readFloat(), buf.readInt());
    }

    public static void handle(VaporPacket msg, CustomPayloadEvent.Context ctx) {
        ClientPacketHandlers.handleVapor(msg);
    }
}
