package com.example.vapemod.client;

import com.example.vapemod.item.VapeItem;
import com.example.vapemod.registry.ModSounds;
import net.minecraft.client.resources.sounds.AbstractTickableSoundInstance;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.player.Player;

/** Quiet inhale crackle that follows a player and stops the moment they stop inhaling. */
public class InhaleSoundInstance extends AbstractTickableSoundInstance {
    private final Player player;

    public InhaleSoundInstance(Player player) {
        super(ModSounds.VAPE_INHALE.get(), SoundSource.PLAYERS, RandomSource.create());
        this.player = player;
        this.volume = 0.45F;
        this.pitch = 0.95F + this.random.nextFloat() * 0.1F;
        this.looping = false;
        this.delay = 0;
        this.x = player.getX();
        this.y = player.getEyeY();
        this.z = player.getZ();
    }

    public static boolean isInhaling(Player player) {
        return player.isAlive() && player.isUsingItem() && player.getUseItem().getItem() instanceof VapeItem;
    }

    @Override
    public void tick() {
        if (player.isRemoved() || !isInhaling(player)) {
            stop();
            return;
        }
        this.x = player.getX();
        this.y = player.getEyeY();
        this.z = player.getZ();
    }
}
