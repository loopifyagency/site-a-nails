# A.Nails Ongles · Brest

Site vitrine one-page de **A.Nails Ongles Prothésiste Ongulaire** (61 rue de Lanninguer, 29200 Brest).
HTML / CSS / JavaScript purs, sans étape de build. Tout est embarqué dans le dépôt (GSAP, Lenis, polices) :
le site fonctionne hors ligne et se déploie tel quel sur n'importe quel hébergement statique.

## Lancer en local

```bash
python3 -m http.server 8123
# puis ouvrir http://localhost:8123
```

## Structure

```
index.html              contenu, SEO, données structurées LocalBusiness (NailSalon)
assets/css/styles.css   design tokens, composants, une mise en scène par section
assets/js/main.js       horaires en direct, menu, avis, atelier + toute la couche de mouvement
assets/img/             photos (agrandies ×3, voir plus bas) + favicon
assets/fonts/           Bodoni Moda (titres) et Bricolage Grotesque (texte), auto-hébergées
assets/vendor/          GSAP 3.15 (+ ScrollTrigger, SplitText, MorphSVG) et Lenis 1.3
```

## Direction artistique

« Laque & facettes » : une boîte à bijoux laquée (aubergine profond), des photos cadrées en **amande**
(la forme d'un ongle, fil rouge du site), le losange du damassé de leur logo, des paillettes.

| Rôle | Couleur |
| --- | --- |
| Fond sombre | `#14061f` laque · `#1f0a31` laque élevée |
| Fond clair | `#fff6fb` nacre · `#f8e6f3` nacre 2 |
| Menthe (imposée) | `#05eccc` action principale, éclat |
| Magenta (imposée) | `#d93ea4` vernis, survol |
| Violet (imposée) | `#a83ad1` profondeur |
| Texte | `#f8ebf7` sur sombre · `#2a0f3c` sur clair |

Les contrastes sont vérifiés (texte ≥ 4,5:1). Le magenta et le violet ont une variante plus profonde
pour le texte sur fond clair (`--magenta-encre`, `--violet-encre`).

## Ce qu'il faut compléter ou valider

- **Prestations et tarifs** : la fiche indiquait « à compléter ». Les créations présentées
  (pastel mat, French en V, stiletto, lignes graphiques, velours) viennent des photos fournies ;
  aucun prix n'est affiché. Les tarifs renvoient vers Planity. Éditer les blocs `.svc` dans `index.html`.
- **Chiffres clés** : ils reprennent des faits des horaires et des avis (3 ans de fidélité, 5 jours
  d'ouverture, 1 h pour une pose, « 1000 % »). À remplacer par les vrais chiffres du salon si vous en avez
  (`data-count` dans la section `.stats`).
- **Photos** : les 5 images fournies sont très petites (≈ 200 px de large). Elles ont été agrandies
  ×3 avec un rééchantillonnage Lanczos, ce qui lisse sans ajouter de détails. Pour un rendu net,
  remplacer `assets/img/photo-1.jpg … photo-5.jpg` par des photos en haute définition (≥ 1200 px de large,
  mêmes noms de fichiers) ; le site s'adapte sans autre changement.
- **Horaires** : tableau `.hours` dans `index.html`, constante `HOURS` en haut de `assets/js/main.js`
  (statut « Ouvert / Fermé » calculé en heure de Paris) et `openingHoursSpecification` dans le JSON-LD.
- **Réservation** : tous les boutons pointent vers la page Planity du salon.

## Mouvement et accessibilité

- Défilement fluide (Lenis), sections épinglées et défilement horizontal (ScrollTrigger) sur écrans
  ≥ 900 px. Version allégée sur mobile et tablette (pas d'épinglage, pas d'inclinaison 3D).
- `prefers-reduced-motion` : pas de préchargeur, pas de défilement lissé, aucune animation ;
  tout le contenu reste visible.
- Sans JavaScript, la page reste complète et lisible.
- Navigation clavier, anneaux de focus aux couleurs du site, onglets d'avis conformes WAI-ARIA.
