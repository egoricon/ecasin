package com.example.vapemod.network;

import com.example.vapemod.VapeMod;
import net.minecraft.resources.Identifier;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraftforge.network.Channel.VersionTest;
import net.minecraftforge.network.ChannelBuilder;
import net.minecraftforge.network.PacketDistributor;
import net.minecraftforge.network.SimpleChannel;

/** Server to client packets: the bar value for the player and vapour clouds for everyone nearby. */
public final class VapeNetwork {
    private VapeNetwork() {}

    private static final int PROTOCOL_VERSION = 1;

    public static final SimpleChannel CHANNEL = ChannelBuilder
            .named(Identifier.fromNamespaceAndPath(VapeMod.MODID, "main"))
            .networkProtocolVersion(PROTOCOL_VERSION)
            .clientAcceptedVersions(VersionTest.exact(PROTOCOL_VERSION))
            .serverAcceptedVersions(VersionTest.exact(PROTOCOL_VERSION))
            .simpleChannel()
                .play()
                    .clientbound()
                        .addMain(SyncVapePacket.class, SyncVapePacket.STREAM_CODEC, SyncVapePacket::handle)
                        .addMain(VaporPacket.class, VaporPacket.STREAM_CODEC, VaporPacket::handle)
            .build();

    /** Forces class loading (and so channel registration) during mod construction. */
    public static void init() {
        VapeMod.LOGGER.debug("Registered network channel {} v{}", CHANNEL.getName(), CHANNEL.getProtocolVersion());
    }

    public static void sendToPlayer(ServerPlayer player, SyncVapePacket packet) {
        CHANNEL.send(packet, PacketDistributor.PLAYER.with(player));
    }

    /** Sends to the entity itself (if it is a player) and to every player tracking it. */
    public static void sendToTrackingAndSelf(Entity entity, VaporPacket packet) {
        CHANNEL.send(packet, PacketDistributor.TRACKING_ENTITY_AND_SELF.with(entity));
    }
}
