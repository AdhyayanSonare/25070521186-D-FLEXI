// Renders captured from the Atlas with the same camera, so the layers line up exactly.
export const LAYERS=[
 {id:'muscles',name:'Muscles',caption:'Muscles, vessels and skeleton, as the atlas opens',src:'/studio/layer-muscles.webp',link:''},
 {id:'skeleton',name:'Skeleton',caption:'Skeleton, 296 parts',src:'/studio/layer-skeleton.webp',link:'?system=skeletal'},
 {id:'vessels',name:'Circulation',caption:'Heart, arteries and veins, 1,066 parts',src:'/studio/layer-vessels.webp',link:'?system=arterial'},
 {id:'organs',name:'Organs',caption:'Heart, lungs, digestive, urinary, endocrine and reproductive organs, 261 parts',src:'/studio/layer-organs.webp',link:''},
 {id:'frame',name:'Skeleton and organs',caption:'The organs inside their bony frame, 557 parts',src:'/studio/layer-frame.webp',link:''},
] as const;
export const EXPLODE_FRAMES=[0,20,40,60,80,100].map(n=>`/studio/explode-${n}.webp`);
