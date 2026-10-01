package com.example.vapemod.client;

import net.minecraft.client.Minecraft;
import net.minecraft.client.player.AbstractClientPlayer;

import java.util.HashMap;
import java.util.Map;

/** Per-tick client work: vapour emitters and inhale sounds for every player in view (including others). */
public final class VapeClientEvents {
    private VapeClientEvents() {}

    private static final Map<Integer, InhaleSoundInstance> INHALE_SOUNDS = new HashMap<>();

    public static void onClientTick() {
        Minecraft mc = Minecraft.getInstance();
        if (mc.level == null) {
            INHALE_SOUNDS.clear();
            VaporEmitters.clear();
            return;
        }
        VaporEmitters.tick();
        tickInhaleSounds(mc);
    }

    private static void tickInhaleSounds(Minecraft mc) {
        INHALE_SOUNDS.entrySet().removeIf(e -> {
            var entity = mc.level.getEntity(e.getKey());
            return e.getValue().isStopped() || !(entity instanceof AbstractClientPlayer p) || !InhaleSoundInstance.isInhaling(p);
        });
        for (AbstractClientPlayer player : mc.level.players()) {
            if (InhaleSoundInstance.isInhaling(player) && !INHALE_SOUNDS.containsKey(player.getId())) {
                InhaleSoundInstance sound = new InhaleSoundInstance(player);
                INHALE_SOUNDS.put(player.getId(), sound);
                mc.getSoundManager().play(sound);
            }
        }
    }

    public static void reset() {
        INHALE_SOUNDS.clear();
        VaporEmitters.clear();
        ClientVapeData.reset();
    }
}
