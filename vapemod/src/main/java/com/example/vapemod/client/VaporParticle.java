package com.example.vapemod.client;

import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.particle.Particle;
import net.minecraft.client.particle.ParticleProvider;
import net.minecraft.client.particle.SingleQuadParticle;
import net.minecraft.client.particle.SpriteSet;
import net.minecraft.core.particles.SimpleParticleType;
import net.minecraft.util.RandomSource;

/** Soft, slowly growing and fading vapour puff that drifts forward, slows down and rises. */
public class VaporParticle extends SingleQuadParticle {
    private static final float MAX_ALPHA = 0.6F;
    private final float baseSize;
    private float growth = 2.5F;

    protected VaporParticle(ClientLevel level, double x, double y, double z, double xd, double yd, double zd, SpriteSet sprites) {
        super(level, x, y, z, sprites.get(level.getRandom()));
        this.xd = xd;
        this.yd = yd;
        this.zd = zd;
        this.friction = 0.9F;
        this.gravity = -0.08F;
        this.hasPhysics = true;
        this.lifetime = 35 + this.random.nextInt(30);
        this.baseSize = 0.1F + this.random.nextFloat() * 0.08F;
        this.quadSize = this.baseSize;
        this.roll = this.random.nextFloat() * (float) (Math.PI * 2);
        this.oRoll = this.roll;
        this.setAlpha(MAX_ALPHA);
    }

    /** Bigger puffs for longer drags. */
    public void setStrength(float strength) {
        this.growth = 1.5F + 2.5F * strength;
        this.lifetime = Math.round(this.lifetime * (0.6F + 0.6F * strength));
    }

    @Override
    public void tick() {
        super.tick();
        float t = (float) this.age / this.lifetime;
        this.quadSize = this.baseSize * (1.0F + growth * t);
        this.setAlpha(MAX_ALPHA * (1.0F - t * t));
        this.oRoll = this.roll;
        this.roll += 0.01F;
    }

    @Override
    protected Layer getLayer() {
        return Layer.TRANSLUCENT;
    }

    public static class Provider implements ParticleProvider<SimpleParticleType> {
        private final SpriteSet sprites;

        public Provider(SpriteSet sprites) {
            this.sprites = sprites;
        }

        @Override
        public Particle createParticle(SimpleParticleType type, ClientLevel level, double x, double y, double z,
                                       double xd, double yd, double zd, RandomSource random) {
            return new VaporParticle(level, x, y, z, xd, yd, zd, sprites);
        }
    }
}
