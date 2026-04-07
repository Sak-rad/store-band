'use server';

import { revalidatePath } from 'next/cache';

export async function revalidatePWA(urls: string[]) {
  for (const url of urls) {
    revalidatePath(url);
  }
}
