# Autoencoders

An interactive, scrollable presentation about autoencoders and variational
autoencoders, made for MAAI901. Every key idea is shown live with small models
trained on 64x64 cat faces, running right in your browser.

## How it's built

- **Training** runs once on a desktop GPU: PyTorch data loaders, models, training
  and export, plus anything too slow for the browser (PCA, latent maps).
- **The site** is plain HTML, CSS and JavaScript with no build step and no
  backend. The models run in the browser with onnxruntime-web, and a service
  worker keeps it working offline.
