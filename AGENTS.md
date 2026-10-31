# Reglas del Agente

Herramienta: **Koala Cowork** (skills en `~/.koalacowork`).

## Principios
- Nunca crear algo que no se haya pedido expl\u00edcitamente
- Nunca generar archivos adicionales no solicitados (README, docs, tests, etc.)
- Solo hacer lo que el usuario dicta
- Ninguna funcionalidad extra no solicitada
- Todo c\u00f3digo auxiliar va dentro de clases, nunca funciones sueltas fuera de clase
- No sobreingenieria en el codigo, dejarlo lo más reducido
- Comentarios únicamente en formato JSDoc, nunca comentarios inline
- Siempre patrones y principios mencionados por el usuario (Builder, DRY, responsabilidad)

## Arquitectura

`index.ts`:Clase Cli(cmd config|summarize|mcp)->ConfigStore|AgenteResumen|ServidorMcp
`src/config/ConfigStore.ts`:static load/save ~/.secti_addons/modelr.json{provider,url,apiKey,model}
`src/mcp/ServidorMcp.ts`:stdio;privados registrarResumen(tool `resumir{texto,nivel:1..4}`->AgenteResumen.resumir), registrarDiagramas(tool `diagrama_<tipo>{texto}`->AgenteResumen.diagramar), registrarDocumentos(tool `documento_<tipo>{texto}`->AgenteResumen.documentar);respuestas text(ruta)+Adjunto.de
`src/mcp/Adjunto.ts`:static de(archivo)->image(png base64) o resource(docx blob base64) segun extension/MIME
`src/agente/Herramientas.ts`:static renderers{17 diagramas}+documentos{1};tipos()/tiposDocumento(),renderer(t)/documento(t),archivo(t)=join(dir,tipo.extension),renderizarDiagrama()+renderizarDocumento()=tools mastra(mkdir+render)
`src/agente/AgenteResumen.ts`:singleton fachada;compone ModeloLlm+Resumidor+Diagramador+Documentador;workflow flujo-resumen=step resumir->then step diagrama-<tipo> c/u(fuente=nivel de tarea diagrama)->then step documento-<tipo> c/u(fuente=nivel de tarea documento);si la tarea esta bloqueada se omite;api ejecutar|resumir|diagramar|documentar
`src/agente/ModeloLlm.ts`:static configuracion(cfg)=proveedor/modelo(openai|openrouter)
`src/agente/Contexto.ts`:static tokens/dividir;limite()=/models cacheado(fallback 8192)
`src/agente/Resumidor.ts`:Agent resumidor;skills=[SkillsStore.DIR]+tool escribir_skill;EXTENSIONES 4 niveles;nivel por tarea via SkillsStore.nivel;resumir(nivel)|niveles();si>contexto fragmenta via resumirTexto/dividir
`src/skills/SkillsStore.ts`:DIR=~/.koalacowork;escribir(nombre,descripcion,instrucciones,{tarea,herramientas,nivel})-><nombre>/SKILL.md validado con validateSkillContent(mastra);politicas()/permite(tarea,herramienta)=interseccion de tareas resumen|diagrama|documento|todas;nivel(tarea)=nivel declarado;considerar(tarea)=criterios de diagramado;validarPolitica=rechaza solape (un campo por tarea, 'todas' choca con especificas);herramienta()=tool escribir_skill
`src/agente/Diagramador.ts`:Agent diagramador+tool;diagramar(tipo,texto)=Horramientas.archivo+mkdir+prompt(DiagramRenderer.prompt+considerar de skills)+generate->assert exists <dir>/<tipo>.<extension>
`src/agente/Documentador.ts`:Agent documentador+tool;documentar(tipo,texto)=igual con prompt(...,"renderizar_documento")->assert documentos/<tipo>.docx
`src/diagramas/DiagramRenderer.ts`:abstract;abstract type,schema,draw();extension="png",dir="diagramas";opt ancho/alto;render()->canvas png;static prompt({type,schema},texto,herramienta="renderizar_diagrama");helpers roundRect,box,wrap,arrow,line,smallText
`src/diagramas/{Ishikawa,Venn,Sinoptico,MapaConceptual,Flujo,Arbol,Pert,Gantt,Radar,MapaCalor,Tendencia,Pareto,FlujoProceso,ArbolDecision,FlujoActualizacion,Sipoc,MapaFlujoValor}Renderer.ts`:extends,17 tipos PNG
`src/documentos/TablaCambiosDocx.ts`:no extiende;type tabla-cambios,extension="docx",dir="documentos";registrado en Herramientas.documentos;render()->docx con libreria `docx`(tabla,encabezado resaltado);salida fuera de diagramas
Nuevo diagrama=nueva subclase en diagramas + registrar en Herramientas.renderers; nuevo documento=clase en documentos + registrar en Herramientas.documentos

## Ejecuci\u00f3n
- Te ejcutas en wsl, pero yo desarollo (El proyecto esta en windows en la carpeta del proyecto) en windows
