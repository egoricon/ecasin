package com.example.vapemod.client;

import com.example.vapemod.registry.ModParticles;
import net.minecraftforge.client.event.AddGuiOverlayLayersEvent;
import net.minecraftforge.client.event.ClientPlayerNetworkEvent;
import net.minecraftforge.client.event.RegisterParticleProvidersEvent;
import net.minecraftforge.client.gui.overlay.ForgeLayeredDraw;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.bus.BusGroup;

/** Client-only setup. Only called when running on the physical client. */
public final class VapeClient {
    private VapeClient() {}

    public static void init(BusGroup modBusGroup) {
        AddGuiOverlayLayersEvent.BUS.addListener(VapeClient::onAddLayers);
        RegisterParticleProvidersEvent.BUS.addListener(VapeClient::onRegisterParticles);
        TickEvent.ClientTickEvent.Post.BUS.addListener(e -> VapeClientEvents.onClientTick());
        ClientPlayerNetworkEvent.LoggingOut.BUS.addListener(e -> VapeClientEvents.reset());
    }

    private static void onAddLayers(AddGuiOverlayLayersEvent event) {
        // drawn with the hotbar decorations, right after the vehicle health (i.e. next to the food bar)
        event.getLayeredDraw().addAbove(ForgeLayeredDraw.HOTBAR_AND_DECOS, VapeHud.LAYER_ID, ForgeLayeredDraw.VEHICLE_HEALTH, VapeHud::extract);
    }

    private static void onRegisterParticles(RegisterParticleProvidersEvent event) {
        event.registerSpriteSet(ModParticles.VAPOR.get(), VaporParticle.Provider::new);
    }
}
