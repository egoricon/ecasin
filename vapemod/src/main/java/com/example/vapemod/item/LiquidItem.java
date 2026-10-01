package com.example.vapemod.item;

import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.SlotAccess;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.component.TooltipDisplay;
import net.minecraft.world.level.Level;

import java.util.function.Consumer;

/** Flavoured liquid. Use it with a vape in the other hand, or right-click it onto a vape in the inventory. */
public class LiquidItem extends Item {
    private final Flavor flavor;

    public LiquidItem(Flavor flavor, Properties properties) {
        super(properties);
        this.flavor = flavor;
    }

    public Flavor flavor() {
        return flavor;
    }

    @Override
    public InteractionResult use(Level level, Player player, InteractionHand hand) {
        ItemStack liquidStack = player.getItemInHand(hand);
        InteractionHand otherHand = hand == InteractionHand.MAIN_HAND ? InteractionHand.OFF_HAND : InteractionHand.MAIN_HAND;
        ItemStack vape = player.getItemInHand(otherHand);
        if (!(vape.getItem() instanceof VapeItem)) {
            if (!level.isClientSide()) {
                player.sendOverlayMessage(Component.translatable("message.vapemod.need_vape").withStyle(ChatFormatting.GRAY));
            }
            return InteractionResult.FAIL;
        }
        // From the off hand only an empty vape is refilled: otherwise holding right click on a
        // vape (e.g. during its cooldown) would silently swap the loaded liquid.
        if (hand == InteractionHand.OFF_HAND && VapeItem.liquid(vape) != null) {
            return InteractionResult.PASS;
        }
        if (!level.isClientSide()) {
            VapeItem.filled(vape, flavor);
            player.sendOverlayMessage(Component.translatable("message.vapemod.refilled", flavor.displayName()));
            level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.BOTTLE_EMPTY, SoundSource.PLAYERS, 1.0F, 1.0F);
            if (!player.hasInfiniteMaterials()) {
                liquidStack.shrink(1);
                giveBottle(player);
            }
        }
        return InteractionResult.SUCCESS;
    }

    /** Called after a vape was refilled from the carried stack in an inventory screen. */
    static void afterRefill(Player player, ItemStack liquidStack, SlotAccess carried) {
        player.playSound(SoundEvents.BOTTLE_EMPTY, 1.0F, 1.0F);
        if (player.hasInfiniteMaterials()) return;
        liquidStack.shrink(1);
        if (liquidStack.isEmpty()) {
            carried.set(new ItemStack(Items.GLASS_BOTTLE));
        } else {
            giveBottle(player);
        }
    }

    private static void giveBottle(Player player) {
        ItemStack bottle = new ItemStack(Items.GLASS_BOTTLE);
        if (!player.getInventory().add(bottle)) {
            player.drop(bottle, false);
        }
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, TooltipDisplay display, Consumer<Component> tooltip, TooltipFlag flag) {
        tooltip.accept(Component.translatable("tooltip.vapemod.liquid.effect",
                Component.translatable(flavor.effect().value().getDescriptionId())).withStyle(ChatFormatting.BLUE));
        tooltip.accept(Component.translatable("tooltip.vapemod.liquid.howto").withStyle(ChatFormatting.DARK_GRAY));
    }
}
