# Breaking camouflage

Deep Learning for Visual Data, Assessment 2: Applied Vision Transformer Report.

Four pre-trained model families, fine-tuned on 52 camouflaged-animal classes from
COD10K-v3, at Base and Large sizes and at 224 and 448 px, three seeds each:

| Family | Pre-training |
| --- | --- |
| ViT | supervised, ImageNet labels |
| ConvNeXt | supervised CNN, comparable ImageNet data |
| CLIP | 400M image-caption pairs |
| DINOv2 | self-supervised, no labels |

## Results

Top-1 accuracy on the 1,949-image test set (random guessing: 1.9%).

| Model | Base, 224 px | Base, 448 px | Large, 224 px |
| --- | --- | --- | --- |
| DINOv2 | 78.1 ± 0.1 | 83.6 ± 0.7 | **84.3 ± 1.2** |
| ConvNeXt | 77.0 ± 0.6 | 82.9 ± 0.8 | 79.5 ± 1.0 |
| ViT | 70.8 ± 0.6 | 78.6 ± 1.0 | 75.1 ± 0.5 |
| CLIP | 70.0 ± 0.6 | 72.3 ± 2.2 | 76.0 ± 1.4 |

- **Pre-training matters more than architecture.** DINOv2 and ConvNeXt tie at
  Base 224 px, and both beat the supervised ViT by 6 to 7 points.
- **Resolution helps small animals most.** 448 px adds 5 to 8 points, and 10.8
  to 12.3 points for animals covering under 2% of the image.
- **The models lean on the habitat.** With the animal greyed out, they still
  score 38 to 59%.

The figures from the report are in the `media` folder. The notebook runs in Colab
with no setup.
