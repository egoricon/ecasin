package com.example.vapemod.client;

import com.example.vapemod.VapeConfig;
import com.example.vapemod.VapeMod;
import com.example.vapemod.item.VapeItem;
import com.example.vapemod.registry.ModEffects;
import com.example.vapemod.vape.VapeData;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.Hud;
import net.minecraft.client.renderer.RenderPipelines;
import net.minecraft.resources.Identifier;
import net.minecraft.tags.FluidTags;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;

/** Vaping bar: 10 icons right above the hunger bar, drawn like the vanilla food icons. */
public final class VapeHud {
    private VapeHud() {}

    public static final Identifier LAYER_ID = id("vape_bar");
    private static final Identifier EMPTY = id("hud/vape_empty");
    private static final Identifier HALF = id("hud/vape_half");
    private static final Identifier FULL = id("hud/vape_full");
    private static final Identifier FULL_HOT = id("hud/vape_full_hot");

    private static final RandomSource RANDOM = RandomSource.create();

    private static Identifier id(String path) {
        return Identifier.fromNamespaceAndPath(VapeMod.MODID, path);
    }

    public static void extract(GuiGraphicsExtractor graphics, DeltaTracker deltaTracker) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.gameMode == null || !mc.gameMode.canHurtPlayer()) return;
        Hud hud = mc.gui.hud;
        Player player = hud.getCameraPlayer();
        if (player == null || !shouldShow(player)) return;

        int right = graphics.guiWidth() / 2 + 91 + VapeConfig.HUD_OFFSET_X.get();
        // the food row is at height - 39; our row goes one line above it
        int top = graphics.guiHeight() - 39 - 10 + VapeConfig.HUD_OFFSET_Y.get();
        LivingEntity vehicle = hud.getPlayerVehicleWithHealth();
        if (vehicle != null) {
            int rows = hud.getVisibleVehicleHeartRows(hud.getVehicleMaxHearts(vehicle));
            top -= Math.max(0, rows - 1) * 10;
        }
        if (player.isEyeInFluid(FluidTags.WATER) || player.getAirSupply() < player.getMaxAirSupply()) {
            top -= 10; // make room for the air bubbles
        }

        int value = Math.round(ClientVapeData.level);
        boolean maxed = ClientVapeData.level >= VapeData.MAX_LEVEL - 0.01F;
        boolean craving = player.hasEffect(ModEffects.holder(ModEffects.CRAVING));
        RANDOM.setSeed(player.tickCount * 312871L);

        for (int i = 0; i < 10; i++) {
            int x = right - i * 8 - 9;
            int y = top;
            if (craving && player.tickCount % 3 == 0) {
                y += RANDOM.nextInt(3) - 1; // icons shake while craving, like hunger
            }
            graphics.blitSprite(RenderPipelines.GUI_TEXTURED, EMPTY, x, y, 9, 9);
            if (i * 2 + 1 < value) {
                graphics.blitSprite(RenderPipelines.GUI_TEXTURED, maxed ? FULL_HOT : FULL, x, y, 9, 9);
            } else if (i * 2 + 1 == value) {
                graphics.blitSprite(RenderPipelines.GUI_TEXTURED, HALF, x, y, 9, 9);
            }
        }
    }

    private static boolean shouldShow(Player player) {
        return VapeConfig.HUD_ALWAYS_VISIBLE.get()
                || ClientVapeData.totalPuffs > 0
                || ClientVapeData.level > 0.0F
                || player.getMainHandItem().getItem() instanceof VapeItem
                || player.getOffhandItem().getItem() instanceof VapeItem;
    }
}
