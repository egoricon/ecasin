package com.example.vapemod.vape;

import net.minecraft.nbt.CompoundTag;
import net.minecraft.world.entity.player.Player;

/**
 * The player's vaping bar (0..20) and counters, stored in Forge's persistent entity data
 * (saved with the player, copied over on death in {@link VapeEvents}).
 */
public final class VapeData {
    public static final float MAX_LEVEL = 20.0F;
    private static final String KEY = "vapemod";

    public float level;
    /** Ticks the bar has been empty in a row. */
    public int emptyTicks;
    /** Ticks since the last natural decrease of the bar. */
    public int decayTicks;
    /** Completed puffs, ever. */
    public int totalPuffs;

    private VapeData() {}

    public static VapeData get(Player player) {
        CompoundTag tag = player.getPersistentData().getCompoundOrEmpty(KEY);
        VapeData data = new VapeData();
        data.level = tag.getFloatOr("level", 0.0F);
        data.emptyTicks = tag.getIntOr("emptyTicks", 0);
        data.decayTicks = tag.getIntOr("decayTicks", 0);
        data.totalPuffs = tag.getIntOr("totalPuffs", 0);
        return data;
    }

    public void save(Player player) {
        CompoundTag tag = new CompoundTag();
        tag.putFloat("level", level);
        tag.putInt("emptyTicks", emptyTicks);
        tag.putInt("decayTicks", decayTicks);
        tag.putInt("totalPuffs", totalPuffs);
        player.getPersistentData().put(KEY, tag);
    }

    /** Copies the data from the old player entity to the new one (death / leaving the End). */
    public static void copy(Player from, Player to) {
        CompoundTag tag = from.getPersistentData().getCompoundOrEmpty(KEY);
        to.getPersistentData().put(KEY, tag.copy());
    }
}
