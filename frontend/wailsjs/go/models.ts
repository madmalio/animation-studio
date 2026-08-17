export namespace apperr {
	
	export class Info {
	    code: string;
	    message: string;
	    details?: string;
	
	    static createFrom(source: any = {}) {
	        return new Info(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.code = source["code"];
	        this.message = source["message"];
	        this.details = source["details"];
	    }
	}
	export class Result_Studio_internal_models_AssetScanResult_ {
	    data: models.AssetScanResult;
	    error?: Info;
	
	    static createFrom(source: any = {}) {
	        return new Result_Studio_internal_models_AssetScanResult_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], models.AssetScanResult);
	        this.error = this.convertValues(source["error"], Info);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Result_Studio_internal_models_Project_ {
	    data: models.Project;
	    error?: Info;
	
	    static createFrom(source: any = {}) {
	        return new Result_Studio_internal_models_Project_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], models.Project);
	        this.error = this.convertValues(source["error"], Info);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Result_string_ {
	    data: string;
	    error?: Info;
	
	    static createFrom(source: any = {}) {
	        return new Result_string_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = source["data"];
	        this.error = this.convertValues(source["error"], Info);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace models {
	
	export class Asset {
	    id: string;
	    libraryId: string;
	    libraryName: string;
	    name: string;
	    kind: string;
	    format: string;
	    absolutePath: string;
	    relativePath: string;
	    url: string;
	    size: number;
	    // Go type: time
	    modifiedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Asset(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.libraryId = source["libraryId"];
	        this.libraryName = source["libraryName"];
	        this.name = source["name"];
	        this.kind = source["kind"];
	        this.format = source["format"];
	        this.absolutePath = source["absolutePath"];
	        this.relativePath = source["relativePath"];
	        this.url = source["url"];
	        this.size = source["size"];
	        this.modifiedAt = this.convertValues(source["modifiedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LibraryRoot {
	    id: string;
	    name: string;
	    dir: string;
	
	    static createFrom(source: any = {}) {
	        return new LibraryRoot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.dir = source["dir"];
	    }
	}
	export class AssetScanResult {
	    library: LibraryRoot;
	    assets: Asset[];
	    imageCount: number;
	    audioCount: number;
	
	    static createFrom(source: any = {}) {
	        return new AssetScanResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.library = this.convertValues(source["library"], LibraryRoot);
	        this.assets = this.convertValues(source["assets"], Asset);
	        this.imageCount = source["imageCount"];
	        this.audioCount = source["audioCount"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class BackgroundImage {
	    assetId: string;
	    fit: string;
	    opacity: number;
	
	    static createFrom(source: any = {}) {
	        return new BackgroundImage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.assetId = source["assetId"];
	        this.fit = source["fit"];
	        this.opacity = source["opacity"];
	    }
	}
	export class Background {
	    color: string;
	    image?: BackgroundImage;
	
	    static createFrom(source: any = {}) {
	        return new Background(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.color = source["color"];
	        this.image = this.convertValues(source["image"], BackgroundImage);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class Point {
	    x: number;
	    y: number;
	
	    static createFrom(source: any = {}) {
	        return new Point(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	    }
	}
	export class Bone {
	    id: string;
	    name: string;
	    parentId?: string;
	    position: Point;
	    rotation: number;
	    length: number;
	
	    static createFrom(source: any = {}) {
	        return new Bone(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.parentId = source["parentId"];
	        this.position = this.convertValues(source["position"], Point);
	        this.rotation = source["rotation"];
	        this.length = source["length"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TextureSwap {
	    slotId?: string;
	    layerId?: string;
	    assetId: string;
	
	    static createFrom(source: any = {}) {
	        return new TextureSwap(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.slotId = source["slotId"];
	        this.layerId = source["layerId"];
	        this.assetId = source["assetId"];
	    }
	}
	export class ExpressionState {
	    expression: string;
	    swaps: TextureSwap[];
	
	    static createFrom(source: any = {}) {
	        return new ExpressionState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.expression = source["expression"];
	        this.swaps = this.convertValues(source["swaps"], TextureSwap);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Keyframe {
	    id?: string;
	    frame: number;
	    value: Record<string, any>;
	
	    static createFrom(source: any = {}) {
	        return new Keyframe(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.frame = source["frame"];
	        this.value = source["value"];
	    }
	}
	export class Scale {
	    x: number;
	    y: number;
	
	    static createFrom(source: any = {}) {
	        return new Scale(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	    }
	}
	export class Layer {
	    id: string;
	    name: string;
	    kind: string;
	    assetId?: string;
	    textureId?: string;
	    boneId?: string;
	    parentId?: string;
	    slotId?: string;
	    position: Point;
	    rotation: number;
	    scale: Scale;
	    anchor: Point;
	    visible: boolean;
	    opacity: number;
	    zIndex: number;
	
	    static createFrom(source: any = {}) {
	        return new Layer(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.kind = source["kind"];
	        this.assetId = source["assetId"];
	        this.textureId = source["textureId"];
	        this.boneId = source["boneId"];
	        this.parentId = source["parentId"];
	        this.slotId = source["slotId"];
	        this.position = this.convertValues(source["position"], Point);
	        this.rotation = source["rotation"];
	        this.scale = this.convertValues(source["scale"], Scale);
	        this.anchor = this.convertValues(source["anchor"], Point);
	        this.visible = source["visible"];
	        this.opacity = source["opacity"];
	        this.zIndex = source["zIndex"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class Track {
	    id: string;
	    kind: string;
	    targetId: string;
	    keyframes: Keyframe[];
	
	    static createFrom(source: any = {}) {
	        return new Track(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.kind = source["kind"];
	        this.targetId = source["targetId"];
	        this.keyframes = this.convertValues(source["keyframes"], Keyframe);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Timeline {
	    durationFrames: number;
	    tracks: Track[];
	
	    static createFrom(source: any = {}) {
	        return new Timeline(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.durationFrames = source["durationFrames"];
	        this.tracks = this.convertValues(source["tracks"], Track);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Prop {
	    id: string;
	    name: string;
	    assetId: string;
	    position: Point;
	    scale: Scale;
	    rotation: number;
	    visible: boolean;
	    opacity: number;
	    zIndex: number;
	
	    static createFrom(source: any = {}) {
	        return new Prop(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.assetId = source["assetId"];
	        this.position = this.convertValues(source["position"], Point);
	        this.scale = this.convertValues(source["scale"], Scale);
	        this.rotation = source["rotation"];
	        this.visible = source["visible"];
	        this.opacity = source["opacity"];
	        this.zIndex = source["zIndex"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class VisemeMapping {
	    viseme: string;
	    durationMs: number;
	    swaps: TextureSwap[];
	
	    static createFrom(source: any = {}) {
	        return new VisemeMapping(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.viseme = source["viseme"];
	        this.durationMs = source["durationMs"];
	        this.swaps = this.convertValues(source["swaps"], TextureSwap);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Slot {
	    id: string;
	    name: string;
	    layerId?: string;
	    assetIDs: string[];
	    activeAssetId: string;
	    position: Point;
	    rotation: number;
	    scale: Scale;
	    anchor: Point;
	    visible: boolean;
	    opacity: number;
	    zIndex: number;
	
	    static createFrom(source: any = {}) {
	        return new Slot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.layerId = source["layerId"];
	        this.assetIDs = source["assetIDs"];
	        this.activeAssetId = source["activeAssetId"];
	        this.position = this.convertValues(source["position"], Point);
	        this.rotation = source["rotation"];
	        this.scale = this.convertValues(source["scale"], Scale);
	        this.anchor = this.convertValues(source["anchor"], Point);
	        this.visible = source["visible"];
	        this.opacity = source["opacity"];
	        this.zIndex = source["zIndex"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Puppet {
	    id: string;
	    name: string;
	    assetId: string;
	    layers: Layer[];
	    bones: Bone[];
	    slots: Slot[];
	    visemeMappings: VisemeMapping[];
	    expressionStates: ExpressionState[];
	    activeViseme: string;
	    activeExpression: string;
	    position: Point;
	    scale: Scale;
	    rotation: number;
	    anchoredToStage: boolean;
	    zIndex: number;
	    visible: boolean;
	    opacity: number;
	
	    static createFrom(source: any = {}) {
	        return new Puppet(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.assetId = source["assetId"];
	        this.layers = this.convertValues(source["layers"], Layer);
	        this.bones = this.convertValues(source["bones"], Bone);
	        this.slots = this.convertValues(source["slots"], Slot);
	        this.visemeMappings = this.convertValues(source["visemeMappings"], VisemeMapping);
	        this.expressionStates = this.convertValues(source["expressionStates"], ExpressionState);
	        this.activeViseme = source["activeViseme"];
	        this.activeExpression = source["activeExpression"];
	        this.position = this.convertValues(source["position"], Point);
	        this.scale = this.convertValues(source["scale"], Scale);
	        this.rotation = source["rotation"];
	        this.anchoredToStage = source["anchoredToStage"];
	        this.zIndex = source["zIndex"];
	        this.visible = source["visible"];
	        this.opacity = source["opacity"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Viewport {
	    width: number;
	    height: number;
	    fps: number;
	
	    static createFrom(source: any = {}) {
	        return new Viewport(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.width = source["width"];
	        this.height = source["height"];
	        this.fps = source["fps"];
	    }
	}
	export class Project {
	    schemaVersion: number;
	    name: string;
	    filePath: string;
	    viewport: Viewport;
	    background: Background;
	    puppets: Puppet[];
	    props: Prop[];
	    timeline?: Timeline;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Project(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.schemaVersion = source["schemaVersion"];
	        this.name = source["name"];
	        this.filePath = source["filePath"];
	        this.viewport = this.convertValues(source["viewport"], Viewport);
	        this.background = this.convertValues(source["background"], Background);
	        this.puppets = this.convertValues(source["puppets"], Puppet);
	        this.props = this.convertValues(source["props"], Prop);
	        this.timeline = this.convertValues(source["timeline"], Timeline);
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	
	
	
	
	

}

