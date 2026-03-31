import { Injectable } from '@nestjs/common';

export type RandomSource = () => number;

@Injectable()
export class DemoMapRandomFactory {
  createSeededRandom(seed: string): RandomSource {
    let state = 0;
    for (let index = 0; index < seed.length; index += 1) {
      state = (state * 31 + seed.charCodeAt(index)) >>> 0;
    }

    return () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }

  createRuntimeRandom(): RandomSource {
    return () => Math.random();
  }

  floatBetween(randomSource: RandomSource, min: number, max: number): number {
    return min + randomSource() * (max - min);
  }

  intBetween(randomSource: RandomSource, min: number, max: number): number {
    return Math.floor(this.floatBetween(randomSource, min, max + 1));
  }
}
