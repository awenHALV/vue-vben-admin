<template>
  <div class="mb-7 text-center sm:mx-auto sm:w-full sm:max-w-md">
    <h2
      class="mb-3 text-2xl/8 font-bold tracking-tight text-foreground lg:text-4xl"
    >
      <slot></slot>
    </h2>

    <p class="lg:text-md text-base/6 text-muted-foreground">
      <slot name="desc"></slot>
    </p>
  </div>
</template>
