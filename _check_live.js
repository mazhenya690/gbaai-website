const https = require('https');
https.get('https://www.gbaai.club', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    // Find scripts
    const scripts = [...d.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
    console.log('=== Scripts ===');
    scripts.forEach(s => console.log(s));
    
    // Find CSS
    const css = [...d.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map(m => m[1]);
    console.log('\n=== CSS ===');
    css.forEach(s => console.log(s));
    
    // Check for meta generator
    const gen = d.match(/<meta[^>]+generator[^>]+>/g);
    if (gen) { console.log('\n=== Generator ==='); gen.forEach(g => console.log(g)); }
    
    // Check for build tool signatures
    const sigs = ['next', 'nuxt', 'vue', 'react', 'astro', 'hugo', 'jekyll', 'wordpress'];
    sigs.forEach(sig => {
      if (d.toLowerCase().includes(sig)) console.log('Found:', sig);
    });
    
    // Get page title and description
    const title = d.match(/<title>([^<]+)</);
    if (title) console.log('\nTitle:', title[1]);
    
    console.log('\nHTML size:', d.length, 'bytes');
    console.log('First 500 chars:', d.substring(0, 500));
  });
});
