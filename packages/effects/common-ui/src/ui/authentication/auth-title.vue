<template>
  <div class="mb-6">
    <h2 class="text-3xl font-semibold tracking-tight text-foreground">
      <slot></slot>
    </h2>
    <p class="mt-2 text-sm text-muted-foreground">
      <slot name="desc"></slot>
    </p>
  </div>
</template>
