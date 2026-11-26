# Diplomas Studio

Editor web para diseñar **diplomas, certificados y reconocimientos** y generarlos **en masa** desde una lista de nombres y RUT.
Es un único archivo (`index.html`) que funciona **sin conexión y sin servidor**: fuentes y librerías van incluidas y los datos no salen de tu equipo.

## Características

- **Vista previa permanente** estilo editor gráfico: tres paneles (contenido · lienzo · diseño), zoom y navegación entre diplomas.
- **Grupos**: cada grupo es un diseño completo (página, fondo, marco, fuentes, textos, firmas, logo, capas, cuadros) con **su propia lista de premiados**. Se pueden duplicar (mismo diseño y textos, lista vacía), crear en blanco, eliminar (hasta 30) y **guardar todos en un solo `.json`**.
- **Texto del diploma editable** con botón para insertar el **espacio del nombre** (punteado en el editor, reemplazado automáticamente). Tamaño, negrita y cursiva por selección.
- **1 o 2 personas por fila** en el mismo archivo: hay un texto para 1 persona y otro para 2; las filas con «Nombre 2» usan el segundo. Firmantes (1–6) con **firma y timbre/sello** importables.
- **Cuadros de texto** con fondo (color, opacidad, esquinas), fuente, tamaño, color, alineación y posición. Admiten `{nombre1} {nombre2} {rut1} {rut2}`. Por cuadro eliges si el texto del diploma queda **superpuesto**, **fluye alrededor** o **empieza después** (debajo) del cuadro.
- **Logo** arriba al centro o abajo al medio de las firmas.
- **49 familias tipográficas** embebidas en 9 estilos (elegantes, serias, clásicas, tecnológicas, lettering, floral, vintage, infantil, deportivo) y **importación de fuentes propias** (`.ttf`, `.otf`, `.woff2`).
- **32 marcos** dibujados por código en 7 estilos (ornamentales, serios, fantasía, floral y naturaleza, vintage y retro, infantil y lúdico, deportivo), con galería de miniaturas, colores editables y **capas personalizadas** (PNG/SVG/JPG) detrás o delante del texto.
- **10 plantillas** listas, fondo con color, degradado, imagen y textura de papel, y **tamaño de página personalizable** en milímetros.
- **Importación** desde Excel (`.xlsx`), CSV o un enlace de Google Sheets. Valida el RUT (módulo 11) y avisa las líneas con error.
- **Exportación**: de todos los grupos o solo el activo. PNG (150/300/600 ppp; un ZIP con una carpeta por grupo) y un único PDF con todos los diplomas en orden de grupo (papel A4, Carta, Oficio, Legal, A3 o igual al diploma, con margen ajustable) y 
- **Tema** automático según el dispositivo, claro u oscuro. Adaptable a computador y smartphone; navegable con teclado.

## Uso rápido

1. Abre `index.html` en un navegador moderno (Chrome, Edge, Firefox o Safari recientes).
2. En **Diseño → Plantillas** elige un punto de partida y ajusta página, fondo, marco y tipografías.
3. En **Contenido** escribe la institución, el título y el texto. Pulsa **+ Espacio nombre 1** donde quieras que aparezca el nombre.
4. Carga los premiados: una fila por diploma con `Nombre ; RUT` (para 2 personas añade `; Nombre 2 ; RUT 2`) o importa el archivo.
5. ¿Otro diseño o texto? Pulsa **Duplicar** (o **+ Nuevo**) en la barra de grupos y carga su lista.
6. **Exportar…** y elige formato, resolución y papel. Usa **Guardar .json** para retomar el trabajo más tarde.

### Formato de la hoja de cálculo

| Nombre | RUT |
|---|---|
| María José Fernández Soto | 12.345.678-5 |

Para diplomas de 2 personas las columnas son `Nombre 1, RUT 1, Nombre 2, RUT 2` (las dos últimas son opcionales por fila). Si la primera fila no contiene números se toma como encabezado. Para Google Sheets, comparte la hoja como «Cualquier persona con el enlace» y pega la URL; si el navegador la bloquea, descárgala como CSV e impórtala.

## Formato del proyecto `.json` (v2)

`{ app, v: 2, cur, groups: [ { name, page, bg, frame, t, body, body2, list, showRut, sign, logo, layers, boxes } ], fonts, exp }`.
Los `.json` de la versión 1 se abren y se convierten automáticamente en un proyecto de un grupo.

## Seguridad y privacidad

- Todo se procesa en el navegador; no hay servidor, cuentas ni analítica.
- Política de seguridad de contenido (CSP) con *hash* por script: no se ejecuta código ajeno. La única conexión permitida es `docs.google.com`, solo al usar «Importar» de Google Sheets.
- El texto del diploma y los datos importados se insertan siempre como texto (nunca como HTML) y los proyectos `.json` se validan campo por campo al abrirlos.
- Las imágenes (PNG, JPG, WebP, GIF, SVG) y fuentes se validan por tipo y tamaño antes de aceptarse.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub y sube **todo el contenido de esta carpeta** (`index.html` debe quedar en la raíz).
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Elige la rama `main` y la carpeta `/ (root)`, y pulsa **Save**.
4. En unos minutos la app estará en `https://<usuario>.github.io/<repositorio>/`.

Con la línea de comandos:

```bash
git init && git add . && git commit -m "Diplomas Studio"
git branch -M main
git remote add origin https://github.com/<usuario>/<repositorio>.git
git push -u origin main
```

## Reconstruir `index.html`

`index.html` es el resultado de compilar `src/`. Solo necesitas reconstruirlo si modificas el código:

```bash
cd build
npm install        # descarga jsPDF, read-excel-file y las fuentes (@fontsource)
python3 build.py   # genera ../index.html (~3,3 MB)
```

Estructura:

```
index.html          app compilada (un solo archivo, offline)
src/index.html      estructura y accesibilidad
src/app.css         estilos y temas (claro/oscuro con light-dark())
src/js/util.js      utilidades: RUT, CSV, ZIP, archivos
src/js/state.js     estado, validación de proyectos y plantillas
src/js/frames.js    marcos decorativos (canvas)
src/js/render.js    motor de dibujo único (vista previa, PNG y PDF)
src/js/ui.js        enlaces de datos, paneles y editor de texto
src/js/io.js        importación, proyectos y exportación
src/js/main.js      arranque, tema y navegación
build/              fonts.json, package.json y build.py
```

La vista previa, el PNG y el PDF usan **la misma función de dibujo** (`paint`), así que lo que ves es lo que se exporta.

## Límites conocidos

- El PDF contiene cada diploma como imagen de alta resolución (JPEG 95 % o PNG sin pérdida), no texto vectorial; no se puede seleccionar el texto.
- Un lote grande a 300–600 ppp consume mucha memoria (sobre todo en móviles): exporta por tandas o baja la resolución. Los `.xls` antiguos deben guardarse como `.xlsx`.
- No incluye envío por correo ni verificación por QR; para eso existen servicios de pago como Certifier.

## Licencias

El código es MIT (ver `LICENSE`). Las fuentes (SIL OFL 1.1) y librerías incluidas se detallan en `THIRD_PARTY.md`.
