package com.example.vapemod.item;

import com.example.vapemod.VapeConfig;
import com.example.vapemod.registry.ModDataComponents;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.util.Mth;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.SlotAccess;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.inventory.ClickAction;
import net.minecraft.world.inventory.Slot;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.ItemUseAnimation;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.component.TooltipDisplay;
import net.minecraft.world.level.Level;
import org.jetbrains.annotations.Nullable;

import java.util.function.Consumer;

/**
 * The vape. Hold right click to inhale (no vapour while holding), release to exhale.
 * The exhale itself (vapour, bar growth, liquid use) is handled in
 * {@link com.example.vapemod.vape.VapeEvents} on Forge's "stop using item" event.
 */
public class VapeItem extends Item {
    public VapeItem(Properties properties) {
        super(properties);
    }

    @Nullable
    public static VapeLiquid liquid(ItemStack stack) {
        VapeLiquid liquid = stack.get(ModDataComponents.LIQUID.get());
        return liquid != null && liquid.puffs() > 0 ? liquid : null;
    }

    /** Fills the vape with a full load of the given flavour (replacing whatever was inside). */
    public static ItemStack filled(ItemStack stack, Flavor flavor) {
        int capacity = VapeConfig.PUFFS_PER_LIQUID.get();
        stack.set(ModDataComponents.LIQUID.get(), new VapeLiquid(flavor, capacity, capacity));
        return stack;
    }

    /** Uses one puff of liquid. */
    public static void consumePuff(ItemStack stack) {
        VapeLiquid liquid = liquid(stack);
        if (liquid == null) return;
        if (liquid.puffs() <= 1) stack.remove(ModDataComponents.LIQUID.get());
        else stack.set(ModDataComponents.LIQUID.get(), liquid.withPuffs(liquid.puffs() - 1));
    }

    @Override
    public InteractionResult use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (liquid(stack) == null) {
            if (!level.isClientSide()) {
                player.sendOverlayMessage(Component.translatable("message.vapemod.empty").withStyle(ChatFormatting.GRAY));
            }
            return InteractionResult.FAIL;
        }
        player.startUsingItem(hand);
        return InteractionResult.CONSUME;
    }

    @Override
    public int getUseDuration(ItemStack stack, LivingEntity entity) {
        return VapeConfig.MAX_PUFF_TICKS.get();
    }

    @Override
    public ItemUseAnimation getUseAnimation(ItemStack stack) {
        // Hold-to-charge like a bow, but the pose brings the device up to the mouth.
        return ItemUseAnimation.TOOT_HORN;
    }

    // --- liquid bar under the item icon ---

    @Override
    public boolean isBarVisible(ItemStack stack) {
        return liquid(stack) != null;
    }

    @Override
    public int getBarWidth(ItemStack stack) {
        VapeLiquid liquid = liquid(stack);
        if (liquid == null) return 0;
        return Mth.clamp(Math.round(13.0F * liquid.puffs() / Math.max(1, liquid.capacity())), 0, 13);
    }

    @Override
    public int getBarColor(ItemStack stack) {
        VapeLiquid liquid = liquid(stack);
        return liquid == null ? 0xFFFFFF : liquid.flavor().color();
    }

    // --- refilling by right-clicking a liquid onto the vape in the inventory ---

    @Override
    public boolean overrideOtherStackedOnMe(ItemStack stack, ItemStack other, Slot slot, ClickAction action, Player player, SlotAccess carried) {
        if (action != ClickAction.SECONDARY || !(other.getItem() instanceof LiquidItem liquidItem)) return false;
        if (!slot.allowModification(player)) return false;
        filled(stack, liquidItem.flavor());
        LiquidItem.afterRefill(player, other, carried);
        return true;
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, TooltipDisplay display, Consumer<Component> tooltip, TooltipFlag flag) {
        VapeLiquid liquid = liquid(stack);
        if (liquid == null) {
            tooltip.accept(Component.translatable("tooltip.vapemod.vape.empty").withStyle(ChatFormatting.GRAY));
        } else {
            tooltip.accept(Component.translatable("tooltip.vapemod.vape.liquid", liquid.flavor().displayName()).withStyle(ChatFormatting.GRAY));
            tooltip.accept(Component.translatable("tooltip.vapemod.vape.puffs", liquid.puffs(), liquid.capacity()).withStyle(ChatFormatting.DARK_GRAY));
        }
        tooltip.accept(Component.translatable("tooltip.vapemod.vape.howto").withStyle(ChatFormatting.DARK_GRAY));
    }
}
