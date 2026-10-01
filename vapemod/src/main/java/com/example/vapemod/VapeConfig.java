package com.example.vapemod;

import net.minecraftforge.common.ForgeConfigSpec;

/**
 * All balance values (thresholds, speeds, durations) live here.
 * COMMON config: config/vapemod-common.toml, CLIENT config: config/vapemod-client.toml.
 */
public final class VapeConfig {
    private VapeConfig() {}

    public static final ForgeConfigSpec COMMON_SPEC;
    public static final ForgeConfigSpec CLIENT_SPEC;

    // --- puff ---
    public static final ForgeConfigSpec.IntValue MIN_PUFF_TICKS;
    public static final ForgeConfigSpec.IntValue MAX_PUFF_TICKS;
    public static final ForgeConfigSpec.IntValue PUFF_COOLDOWN_TICKS;
    public static final ForgeConfigSpec.IntValue PUFFS_PER_LIQUID;

    // --- bar ---
    public static final ForgeConfigSpec.DoubleValue GAIN_PER_FULL_PUFF;
    public static final ForgeConfigSpec.DoubleValue DECAY_AMOUNT;
    public static final ForgeConfigSpec.IntValue DECAY_INTERVAL_TICKS;

    // --- flavour effects ---
    public static final ForgeConfigSpec.IntValue FLAVOR_EFFECT_TICKS;

    // --- cough (over the limit) ---
    public static final ForgeConfigSpec.IntValue COUGH_BASE_TICKS;
    public static final ForgeConfigSpec.IntValue COUGH_TICKS_PER_POINT;
    public static final ForgeConfigSpec.IntValue COUGH_NAUSEA_TICKS;

    // --- craving (empty bar for a long time) ---
    public static final ForgeConfigSpec.IntValue CRAVING_DELAY_TICKS;
    public static final ForgeConfigSpec.IntValue CRAVING_MIN_PUFFS;
    public static final ForgeConfigSpec.IntValue CRAVING_EFFECT_TICKS;

    // --- client ---
    public static final ForgeConfigSpec.BooleanValue HUD_ALWAYS_VISIBLE;
    public static final ForgeConfigSpec.IntValue HUD_OFFSET_X;
    public static final ForgeConfigSpec.IntValue HUD_OFFSET_Y;

    static {
        var b = new ForgeConfigSpec.Builder();

        b.comment("Puffing (20 ticks = 1 second)").push("puff");
        MIN_PUFF_TICKS = b.comment("Releasing earlier than this gives no vapour and no bar growth (6 ticks = 0.3 s)")
                .defineInRange("minPuffTicks", 6, 1, 200);
        MAX_PUFF_TICKS = b.comment("Longest possible puff; after this the player exhales automatically (60 ticks = 3 s)")
                .defineInRange("maxPuffTicks", 60, 10, 400);
        PUFF_COOLDOWN_TICKS = b.comment("Cooldown after each exhale")
                .defineInRange("puffCooldownTicks", 10, 0, 200);
        PUFFS_PER_LIQUID = b.comment("How many puffs one liquid bottle gives")
                .defineInRange("puffsPerLiquid", 40, 1, 10000);
        b.pop();

        b.comment("Vaping bar: 0..20 points, shown as 10 icons next to the hunger bar").push("bar");
        GAIN_PER_FULL_PUFF = b.comment("Bar points added by a maximum-length puff (shorter puffs add proportionally less)")
                .defineInRange("gainPerFullPuff", 3.0, 0.0, 20.0);
        DECAY_AMOUNT = b.comment("Bar points removed every decay interval")
                .defineInRange("decayAmount", 1.0, 0.0, 20.0);
        DECAY_INTERVAL_TICKS = b.comment("How often the bar goes down by itself (600 ticks = 30 s)")
                .defineInRange("decayIntervalTicks", 600, 20, 72000);
        b.pop();

        b.comment("Liquid flavour effects").push("flavor");
        FLAVOR_EFFECT_TICKS = b.comment("Flavour effect duration for a maximum-length puff")
                .defineInRange("flavorEffectTicks", 160, 0, 72000);
        b.pop();

        b.comment("Cough: puffing while the bar is full").push("cough");
        COUGH_BASE_TICKS = b.defineInRange("coughBaseTicks", 100, 0, 72000);
        COUGH_TICKS_PER_POINT = b.comment("Extra cough duration per bar point above the maximum")
                .defineInRange("coughTicksPerPoint", 60, 0, 72000);
        COUGH_NAUSEA_TICKS = b.defineInRange("coughNauseaTicks", 160, 0, 72000);
        b.pop();

        b.comment("Craving: the bar stayed empty for a long time").push("craving");
        CRAVING_DELAY_TICKS = b.comment("How long the bar must stay empty before craving starts (6000 ticks = 5 min)")
                .defineInRange("cravingDelayTicks", 6000, 20, 1728000);
        CRAVING_MIN_PUFFS = b.comment("Craving only affects players who have made at least this many puffs in total")
                .defineInRange("cravingMinPuffs", 5, 0, 1000000);
        CRAVING_EFFECT_TICKS = b.comment("Duration of each craving application (it is re-applied while the bar stays empty)")
                .defineInRange("cravingEffectTicks", 400, 20, 72000);
        b.pop();

        COMMON_SPEC = b.build();

        var c = new ForgeConfigSpec.Builder();
        c.push("hud");
        HUD_ALWAYS_VISIBLE = c.comment("Show the vaping bar even if you have never vaped and are not holding a vape")
                .define("alwaysVisible", false);
        HUD_OFFSET_X = c.defineInRange("offsetX", 0, -1000, 1000);
        HUD_OFFSET_Y = c.defineInRange("offsetY", 0, -1000, 1000);
        c.pop();
        CLIENT_SPEC = c.build();
    }
}
