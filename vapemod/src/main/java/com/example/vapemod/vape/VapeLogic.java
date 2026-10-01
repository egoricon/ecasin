package com.example.vapemod.vape;

import com.example.vapemod.VapeConfig;
import com.example.vapemod.item.VapeItem;
import com.example.vapemod.item.VapeLiquid;
import com.example.vapemod.network.SyncVapePacket;
import com.example.vapemod.network.VaporPacket;
import com.example.vapemod.network.VapeNetwork;
import com.example.vapemod.registry.ModEffects;
import com.example.vapemod.registry.ModSounds;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.Mth;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.item.ItemStack;

/** Server-side rules: what an exhale does, how the bar grows and decays, cough and craving. */
public final class VapeLogic {
    private VapeLogic() {}

    /** How often (in ticks) the per-player bookkeeping runs. */
    public static final int TICK_STEP = 20;

    /**
     * Called once when the player stops inhaling (right click released, or the maximum puff
     * length was reached). Interrupted puffs (slot change, hit, death) never get here.
     */
    public static void exhale(ServerPlayer player, ItemStack vape, int usedTicks) {
        if (!player.isAlive() || player.isSpectator()) return;
        int minTicks = VapeConfig.MIN_PUFF_TICKS.get();
        int maxTicks = VapeConfig.MAX_PUFF_TICKS.get();
        if (usedTicks < minTicks) return; // released too early: no vapour, no bar growth

        VapeLiquid liquid = VapeItem.liquid(vape);
        if (liquid == null) return;

        float strength = Mth.clamp((float) usedTicks / maxTicks, 0.0F, 1.0F);

        if (!player.hasInfiniteMaterials()) {
            VapeItem.consumePuff(vape);
        }
        int cooldown = VapeConfig.PUFF_COOLDOWN_TICKS.get();
        if (cooldown > 0) {
            player.getCooldowns().addCooldown(vape, cooldown);
        }

        // --- bar ---
        VapeData data = VapeData.get(player);
        float before = data.level;
        float gain = (float) (VapeConfig.GAIN_PER_FULL_PUFF.get() * strength);
        float overflow = before + gain - VapeData.MAX_LEVEL;
        data.level = Math.min(VapeData.MAX_LEVEL, before + gain);
        data.totalPuffs++;
        data.emptyTicks = 0;
        data.save(player);
        sync(player, data);
        player.removeEffect(ModEffects.holder(ModEffects.CRAVING));

        // --- flavour effect ---
        int flavorTicks = Math.round(VapeConfig.FLAVOR_EFFECT_TICKS.get() * (0.4F + 0.6F * strength));
        if (flavorTicks > 0) {
            // no swirl particles (they fly right in front of the camera every puff), icon only
            player.addEffect(new MobEffectInstance(liquid.flavor().effect(), flavorTicks, 0, false, false, true));
        }

        // --- over the limit: cough ---
        boolean wasFull = before >= VapeData.MAX_LEVEL - 0.01F;
        if (wasFull || overflow > 0.0F) {
            cough(player, Math.max(overflow, 0.0F) + (wasFull ? gain : 0.0F));
        }

        // --- exhale: sound for everyone nearby, vapour for everyone tracking the player ---
        player.level().playSound(null, player.getX(), player.getEyeY(), player.getZ(), ModSounds.VAPE_EXHALE.get(),
                SoundSource.PLAYERS, 0.35F + 0.65F * strength, 0.9F + player.getRandom().nextFloat() * 0.2F);
        if (!player.isUnderWater()) {
            VapeNetwork.sendToTrackingAndSelf(player, new VaporPacket(player.getId(), strength, liquid.flavor().color()));
        }
    }

    private static void cough(ServerPlayer player, float pointsOver) {
        int coughTicks = VapeConfig.COUGH_BASE_TICKS.get() + Math.round(pointsOver * VapeConfig.COUGH_TICKS_PER_POINT.get());
        if (coughTicks > 0) {
            player.addEffect(new MobEffectInstance(ModEffects.holder(ModEffects.COUGH), coughTicks, 0, false, true, true));
        }
        int nauseaTicks = VapeConfig.COUGH_NAUSEA_TICKS.get();
        if (nauseaTicks > 0) {
            player.addEffect(new MobEffectInstance(MobEffects.NAUSEA, nauseaTicks, 0, false, true, true));
        }
        player.level().playSound(null, player.getX(), player.getEyeY(), player.getZ(), ModSounds.COUGH.get(),
                SoundSource.PLAYERS, 0.9F, 0.9F + player.getRandom().nextFloat() * 0.2F);
    }

    /** Runs every {@link #TICK_STEP} ticks for each player: natural decay and craving. */
    public static void tick(ServerPlayer player) {
        if (!player.isAlive()) return;
        VapeData data = VapeData.get(player);
        float before = data.level;

        if (data.level > 0.0F) {
            data.decayTicks += TICK_STEP;
            int interval = VapeConfig.DECAY_INTERVAL_TICKS.get();
            if (data.decayTicks >= interval) {
                data.decayTicks = 0;
                data.level = Math.max(0.0F, data.level - VapeConfig.DECAY_AMOUNT.get().floatValue());
            }
            data.emptyTicks = 0;
        } else {
            data.decayTicks = 0;
            if (data.totalPuffs >= VapeConfig.CRAVING_MIN_PUFFS.get() && data.totalPuffs > 0) {
                data.emptyTicks += TICK_STEP;
                if (data.emptyTicks >= VapeConfig.CRAVING_DELAY_TICKS.get()) {
                    MobEffectInstance current = player.getEffect(ModEffects.holder(ModEffects.CRAVING));
                    if (current == null || current.endsWithin(TICK_STEP * 2)) {
                        player.addEffect(new MobEffectInstance(ModEffects.holder(ModEffects.CRAVING),
                                VapeConfig.CRAVING_EFFECT_TICKS.get(), 0, false, false, true));
                    }
                }
            }
        }

        data.save(player);
        if (data.level != before) {
            sync(player, data);
        }
    }

    public static void sync(ServerPlayer player) {
        sync(player, VapeData.get(player));
    }

    private static void sync(ServerPlayer player, VapeData data) {
        VapeNetwork.sendToPlayer(player, new SyncVapePacket(data.level, data.totalPuffs));
    }
}
