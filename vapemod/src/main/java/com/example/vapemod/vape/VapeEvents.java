package com.example.vapemod.vape;

import com.example.vapemod.item.VapeItem;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.living.LivingDamageEvent;
import net.minecraftforge.event.entity.living.LivingDeathEvent;
import net.minecraftforge.event.entity.living.LivingEntityUseItemEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;

/** Forge game-bus listeners (server side logic). */
public final class VapeEvents {
    private VapeEvents() {}

    public static void register() {
        // Exhale happens on release of right click: Forge's "stop using item" event.
        LivingEntityUseItemEvent.Stop.BUS.addListener(VapeEvents::onUseStop);
        // Max puff length reached: the use finishes by itself, the player exhales automatically.
        LivingEntityUseItemEvent.Finish.BUS.addListener(VapeEvents::onUseFinish);
        // A hit or death interrupts the puff: no vapour, no bar growth.
        LivingDamageEvent.BUS.addListener(VapeEvents::onDamage);
        LivingDeathEvent.BUS.addListener(VapeEvents::onDeath);

        TickEvent.PlayerTickEvent.Post.BUS.addListener(VapeEvents::onPlayerTick);
        PlayerEvent.Clone.BUS.addListener(VapeEvents::onClone);
        PlayerEvent.PlayerLoggedInEvent.BUS.addListener(e -> syncIfServer(e.getEntity()));
        PlayerEvent.PlayerRespawnEvent.BUS.addListener(e -> syncIfServer(e.getEntity()));
        PlayerEvent.PlayerChangedDimensionEvent.BUS.addListener(e -> syncIfServer(e.getEntity()));
    }

    private static void onUseStop(LivingEntityUseItemEvent.Stop event) {
        if (event.getEntity() instanceof ServerPlayer player && event.getItem().getItem() instanceof VapeItem) {
            int usedTicks = event.getItem().getUseDuration(player) - event.getDuration();
            VapeLogic.exhale(player, event.getItem(), usedTicks);
        }
    }

    private static void onUseFinish(LivingEntityUseItemEvent.Finish event) {
        if (event.getEntity() instanceof ServerPlayer player && event.getItem().getItem() instanceof VapeItem) {
            // getItem() is a copy, the result stack is the one that stays in the hand
            ItemStack vape = event.getResultStack();
            if (vape.getItem() instanceof VapeItem) {
                VapeLogic.exhale(player, vape, vape.getUseDuration(player));
            }
        }
    }

    private static void onDamage(LivingDamageEvent event) {
        if (event.getEntity() instanceof ServerPlayer player && event.getAmount() > 0.0F) {
            interrupt(player);
        }
    }

    private static void onDeath(LivingDeathEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            interrupt(player);
        }
    }

    private static void interrupt(ServerPlayer player) {
        if (player.isUsingItem() && player.getUseItem().getItem() instanceof VapeItem) {
            // stopUsingItem (not releaseUsingItem): no Stop event, so no exhale
            player.stopUsingItem();
        }
    }

    private static void onPlayerTick(TickEvent.PlayerTickEvent.Post event) {
        if (event.player() instanceof ServerPlayer player && player.tickCount % VapeLogic.TICK_STEP == 0) {
            VapeLogic.tick(player);
        }
    }

    private static void onClone(PlayerEvent.Clone event) {
        // keep the bar after death (and when coming back from the End)
        VapeData.copy(event.getOriginal(), event.getEntity());
    }

    private static void syncIfServer(Player player) {
        if (player instanceof ServerPlayer serverPlayer) {
            VapeLogic.sync(serverPlayer);
        }
    }
}
