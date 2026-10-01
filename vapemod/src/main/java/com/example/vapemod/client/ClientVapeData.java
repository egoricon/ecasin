package com.example.vapemod.client;

/** Client copy of the local player's vaping bar, updated by {@link com.example.vapemod.network.SyncVapePacket}. */
public final class ClientVapeData {
    private ClientVapeData() {}

    public static float level;
    public static int totalPuffs;

    public static void set(float newLevel, int newTotalPuffs) {
        level = newLevel;
        totalPuffs = newTotalPuffs;
    }

    public static void reset() {
        set(0.0F, 0);
    }
}
