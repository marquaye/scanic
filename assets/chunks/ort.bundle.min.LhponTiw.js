var rm=Object.defineProperty;var am=(e,t,i)=>t in e?rm(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var ys=(e,t,i)=>am(e,typeof t!="symbol"?t+"":t,i);/*!
 * ONNX Runtime Web v1.23.2
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */var Aa=Object.defineProperty,nm=Object.getOwnPropertyDescriptor,sm=Object.getOwnPropertyNames,om=Object.prototype.hasOwnProperty,um=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(t,i)=>(typeof require<"u"?require:t)[i]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')}),q=(e,t)=>()=>(e&&(t=e(e=0)),t),Gt=(e,t)=>{for(var i in t)Aa(e,i,{get:t[i],enumerable:!0})},lm=(e,t,i,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of sm(t))!om.call(e,n)&&n!==i&&Aa(e,n,{get:()=>t[n],enumerable:!(a=nm(t,n))||a.enumerable});return e},ci=e=>lm(Aa({},"__esModule",{value:!0}),e),Yt,mt,Wt,bs,Ql,Jl=q(()=>{Yt=new Map,mt=[],Wt=(e,t,i)=>{if(t&&typeof t.init=="function"&&typeof t.createInferenceSessionHandler=="function"){let a=Yt.get(e);if(a===void 0)Yt.set(e,{backend:t,priority:i});else{if(a.priority>i)return;if(a.priority===i&&a.backend!==t)throw new Error(`cannot register backend "${e}" using priority ${i}`)}if(i>=0){let n=mt.indexOf(e);n!==-1&&mt.splice(n,1);for(let r=0;r<mt.length;r++)if(Yt.get(mt[r]).priority<=i){mt.splice(r,0,e);return}mt.push(e)}return}throw new TypeError("not a valid backend")},bs=async e=>{let t=Yt.get(e);if(!t)return"backend not found.";if(t.initialized)return t.backend;if(t.aborted)return t.error;{let i=!!t.initPromise;try{return i||(t.initPromise=t.backend.init(e)),await t.initPromise,t.initialized=!0,t.backend}catch(a){return i||(t.error=`${a}`,t.aborted=!0),t.error}finally{delete t.initPromise}}},Ql=async e=>{let t=e.executionProviders||[],i=t.map(p=>typeof p=="string"?p:p.name),a=i.length===0?mt:i,n,r=[],o=new Set;for(let p of a){let d=await bs(p);typeof d=="string"?r.push({name:p,err:d}):(n||(n=d),n===d&&o.add(p))}if(!n)throw new Error(`no available backend found. ERR: ${r.map(p=>`[${p.name}] ${p.err}`).join(", ")}`);for(let{name:p,err:d}of r)i.includes(p)&&console.warn(`removing requested execution provider "${p}" from session options because it is not available: ${d}`);let u=t.filter(p=>o.has(typeof p=="string"?p:p.name));return[n,new Proxy(e,{get:(p,d)=>d==="executionProviders"?u:Reflect.get(p,d)})]}}),dm=q(()=>{Jl()}),ed,pm=q(()=>{ed="1.23.2"}),yr,Ie,td=q(()=>{pm(),yr="warning",Ie={wasm:{},webgl:{},webgpu:{},versions:{common:ed},set logLevel(e){if(e!==void 0){if(typeof e!="string"||["verbose","info","warning","error","fatal"].indexOf(e)===-1)throw new Error(`Unsupported logging level: ${e}`);yr=e}},get logLevel(){return yr}},Object.defineProperty(Ie,"logLevel",{enumerable:!0})}),be,cm=q(()=>{td(),be=Ie}),id,rd,fm=q(()=>{id=(e,t)=>{let i=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);i.width=e.dims[3],i.height=e.dims[2];let a=i.getContext("2d");if(a!=null){let n,r;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(n=e.dims[2],r=e.dims[3]):(n=e.dims[3],r=e.dims[2]);let o=(t==null?void 0:t.format)!==void 0?t.format:"RGB",u=t==null?void 0:t.norm,p,d;u===void 0||u.mean===void 0?p=[255,255,255,255]:typeof u.mean=="number"?p=[u.mean,u.mean,u.mean,u.mean]:(p=[u.mean[0],u.mean[1],u.mean[2],0],u.mean[3]!==void 0&&(p[3]=u.mean[3])),u===void 0||u.bias===void 0?d=[0,0,0,0]:typeof u.bias=="number"?d=[u.bias,u.bias,u.bias,u.bias]:(d=[u.bias[0],u.bias[1],u.bias[2],0],u.bias[3]!==void 0&&(d[3]=u.bias[3]));let f=r*n,m=0,g=f,_=f*2,b=-1;o==="RGBA"?(m=0,g=f,_=f*2,b=f*3):o==="RGB"?(m=0,g=f,_=f*2):o==="RBG"&&(m=0,_=f,g=f*2);for(let w=0;w<r;w++)for(let C=0;C<n;C++){let v=(e.data[m++]-d[0])*p[0],$=(e.data[g++]-d[1])*p[1],T=(e.data[_++]-d[2])*p[2],k=b===-1?255:(e.data[b++]-d[3])*p[3];a.fillStyle="rgba("+v+","+$+","+T+","+k+")",a.fillRect(C,w,1,1)}if("toDataURL"in i)return i.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},rd=(e,t)=>{let i=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),a;if(i!=null){let n,r,o;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(n=e.dims[2],r=e.dims[1],o=e.dims[3]):(n=e.dims[3],r=e.dims[2],o=e.dims[1]);let u=t!==void 0&&t.format!==void 0?t.format:"RGB",p=t==null?void 0:t.norm,d,f;p===void 0||p.mean===void 0?d=[255,255,255,255]:typeof p.mean=="number"?d=[p.mean,p.mean,p.mean,p.mean]:(d=[p.mean[0],p.mean[1],p.mean[2],255],p.mean[3]!==void 0&&(d[3]=p.mean[3])),p===void 0||p.bias===void 0?f=[0,0,0,0]:typeof p.bias=="number"?f=[p.bias,p.bias,p.bias,p.bias]:(f=[p.bias[0],p.bias[1],p.bias[2],0],p.bias[3]!==void 0&&(f[3]=p.bias[3]));let m=r*n;if(t!==void 0&&(t.format!==void 0&&o===4&&t.format!=="RGBA"||o===3&&t.format!=="RGB"&&t.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let g=4,_=0,b=1,w=2,C=3,v=0,$=m,T=m*2,k=-1;u==="RGBA"?(v=0,$=m,T=m*2,k=m*3):u==="RGB"?(v=0,$=m,T=m*2):u==="RBG"&&(v=0,T=m,$=m*2),a=i.createImageData(n,r);for(let S=0;S<r*n;_+=g,b+=g,w+=g,C+=g,S++)a.data[_]=(e.data[v++]-f[0])*d[0],a.data[b]=(e.data[$++]-f[1])*d[1],a.data[w]=(e.data[T++]-f[2])*d[2],a.data[C]=k===-1?255:(e.data[k++]-f[3])*d[3]}else throw new Error("Can not access image data");return a}}),Ci,ad,nd,sd,od,ud,hm=q(()=>{Oa(),Ci=(e,t)=>{if(e===void 0)throw new Error("Image buffer must be defined");if(t.height===void 0||t.width===void 0)throw new Error("Image height and width must be defined");if(t.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:i,width:a}=t,n=t.norm??{mean:255,bias:0},r,o;typeof n.mean=="number"?r=[n.mean,n.mean,n.mean,n.mean]:r=[n.mean[0],n.mean[1],n.mean[2],n.mean[3]??255],typeof n.bias=="number"?o=[n.bias,n.bias,n.bias,n.bias]:o=[n.bias[0],n.bias[1],n.bias[2],n.bias[3]??0];let u=t.format!==void 0?t.format:"RGBA",p=t.tensorFormat!==void 0&&t.tensorFormat!==void 0?t.tensorFormat:"RGB",d=i*a,f=p==="RGBA"?new Float32Array(d*4):new Float32Array(d*3),m=4,g=0,_=1,b=2,w=3,C=0,v=d,$=d*2,T=-1;u==="RGB"&&(m=3,g=0,_=1,b=2,w=-1),p==="RGBA"?T=d*3:p==="RBG"?(C=0,$=d,v=d*2):p==="BGR"&&($=0,v=d,C=d*2);for(let k=0;k<d;k++,g+=m,b+=m,_+=m,w+=m)f[C++]=(e[g]+o[0])/r[0],f[v++]=(e[_]+o[1])/r[1],f[$++]=(e[b]+o[2])/r[2],T!==-1&&w!==-1&&(f[T++]=(e[w]+o[3])/r[3]);return p==="RGBA"?new Ue("float32",f,[1,4,i,a]):new Ue("float32",f,[1,3,i,a])},ad=async(e,t)=>{let i=typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement,a=typeof ImageData<"u"&&e instanceof ImageData,n=typeof ImageBitmap<"u"&&e instanceof ImageBitmap,r=typeof e=="string",o,u=t??{},p=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},d=f=>typeof HTMLCanvasElement<"u"&&f instanceof HTMLCanvasElement||f instanceof OffscreenCanvas?f.getContext("2d"):null;if(i){let f=p();f.width=e.width,f.height=e.height;let m=d(f);if(m!=null){let g=e.height,_=e.width;if(t!==void 0&&t.resizedHeight!==void 0&&t.resizedWidth!==void 0&&(g=t.resizedHeight,_=t.resizedWidth),t!==void 0){if(u=t,t.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");u.tensorFormat="RGBA",u.height=g,u.width=_}else u.tensorFormat="RGBA",u.height=g,u.width=_;m.drawImage(e,0,0),o=m.getImageData(0,0,_,g).data}else throw new Error("Can not access image data")}else if(a){let f,m;if(t!==void 0&&t.resizedWidth!==void 0&&t.resizedHeight!==void 0?(f=t.resizedHeight,m=t.resizedWidth):(f=e.height,m=e.width),t!==void 0&&(u=t),u.format="RGBA",u.height=f,u.width=m,t!==void 0){let g=p();g.width=m,g.height=f;let _=d(g);if(_!=null)_.putImageData(e,0,0),o=_.getImageData(0,0,m,f).data;else throw new Error("Can not access image data")}else o=e.data}else if(n){if(t===void 0)throw new Error("Please provide image config with format for Imagebitmap");let f=p();f.width=e.width,f.height=e.height;let m=d(f);if(m!=null){let g=e.height,_=e.width;return m.drawImage(e,0,0,_,g),o=m.getImageData(0,0,_,g).data,u.height=g,u.width=_,Ci(o,u)}else throw new Error("Can not access image data")}else{if(r)return new Promise((f,m)=>{let g=p(),_=d(g);if(!e||!_)return m();let b=new Image;b.crossOrigin="Anonymous",b.src=e,b.onload=()=>{g.width=b.width,g.height=b.height,_.drawImage(b,0,0,g.width,g.height);let w=_.getImageData(0,0,g.width,g.height);u.height=g.height,u.width=g.width,f(Ci(w.data,u))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(o!==void 0)return Ci(o,u);throw new Error("Input data provided is not supported - aborted tensor creation")},nd=(e,t)=>{let{width:i,height:a,download:n,dispose:r}=t,o=[1,a,i,4];return new Ue({location:"texture",type:"float32",texture:e,dims:o,download:n,dispose:r})},sd=(e,t)=>{let{dataType:i,dims:a,download:n,dispose:r}=t;return new Ue({location:"gpu-buffer",type:i??"float32",gpuBuffer:e,dims:a,download:n,dispose:r})},od=(e,t)=>{let{dataType:i,dims:a,download:n,dispose:r}=t;return new Ue({location:"ml-tensor",type:i??"float32",mlTensor:e,dims:a,download:n,dispose:r})},ud=(e,t,i)=>new Ue({location:"cpu-pinned",type:e,data:t,dims:i??[t.length]})}),Et,oi,br,ld,mm=q(()=>{Et=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),oi=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),br=!1,ld=()=>{if(!br){br=!0;let e=typeof BigInt64Array<"u"&&BigInt64Array.from,t=typeof BigUint64Array<"u"&&BigUint64Array.from,i=globalThis.Float16Array,a=typeof i<"u"&&i.from;e&&(Et.set("int64",BigInt64Array),oi.set(BigInt64Array,"int64")),t&&(Et.set("uint64",BigUint64Array),oi.set(BigUint64Array,"uint64")),a?(Et.set("float16",i),oi.set(i,"float16")):Et.set("float16",Uint16Array)}}}),dd,pd,gm=q(()=>{Oa(),dd=e=>{let t=1;for(let i=0;i<e.length;i++){let a=e[i];if(typeof a!="number"||!Number.isSafeInteger(a))throw new TypeError(`dims[${i}] must be an integer, got: ${a}`);if(a<0)throw new RangeError(`dims[${i}] must be a non-negative integer, got: ${a}`);t*=a}return t},pd=(e,t)=>{switch(e.location){case"cpu":return new Ue(e.type,e.data,t);case"cpu-pinned":return new Ue({location:"cpu-pinned",data:e.data,type:e.type,dims:t});case"texture":return new Ue({location:"texture",texture:e.texture,type:e.type,dims:t});case"gpu-buffer":return new Ue({location:"gpu-buffer",gpuBuffer:e.gpuBuffer,type:e.type,dims:t});case"ml-tensor":return new Ue({location:"ml-tensor",mlTensor:e.mlTensor,type:e.type,dims:t});default:throw new Error(`tensorReshape: tensor location ${e.location} is not supported`)}}}),Ue,Oa=q(()=>{fm(),hm(),mm(),gm(),Ue=class{constructor(e,t,i){ld();let a,n;if(typeof e=="object"&&"location"in e)switch(this.dataLocation=e.location,a=e.type,n=e.dims,e.location){case"cpu-pinned":{let o=Et.get(a);if(!o)throw new TypeError(`unsupported type "${a}" to create tensor from pinned buffer`);if(!(e.data instanceof o))throw new TypeError(`buffer should be of type ${o.name}`);this.cpuData=e.data;break}case"texture":{if(a!=="float32")throw new TypeError(`unsupported type "${a}" to create tensor from texture`);this.gpuTextureData=e.texture,this.downloader=e.download,this.disposer=e.dispose;break}case"gpu-buffer":{if(a!=="float32"&&a!=="float16"&&a!=="int32"&&a!=="int64"&&a!=="uint32"&&a!=="uint8"&&a!=="bool"&&a!=="uint4"&&a!=="int4")throw new TypeError(`unsupported type "${a}" to create tensor from gpu buffer`);this.gpuBufferData=e.gpuBuffer,this.downloader=e.download,this.disposer=e.dispose;break}case"ml-tensor":{if(a!=="float32"&&a!=="float16"&&a!=="int32"&&a!=="int64"&&a!=="uint32"&&a!=="uint64"&&a!=="int8"&&a!=="uint8"&&a!=="bool"&&a!=="uint4"&&a!=="int4")throw new TypeError(`unsupported type "${a}" to create tensor from MLTensor`);this.mlTensorData=e.mlTensor,this.downloader=e.download,this.disposer=e.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let o,u;if(typeof e=="string")if(a=e,u=i,e==="string"){if(!Array.isArray(t))throw new TypeError("A string tensor's data must be a string array.");o=t}else{let p=Et.get(e);if(p===void 0)throw new TypeError(`Unsupported tensor type: ${e}.`);if(Array.isArray(t)){if(e==="float16"&&p===Uint16Array||e==="uint4"||e==="int4")throw new TypeError(`Creating a ${e} tensor from number array is not supported. Please use ${p.name} as data.`);e==="uint64"||e==="int64"?o=p.from(t,BigInt):o=p.from(t)}else if(t instanceof p)o=t;else if(t instanceof Uint8ClampedArray)if(e==="uint8")o=Uint8Array.from(t);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else if(e==="float16"&&t instanceof Uint16Array&&p!==Uint16Array)o=new globalThis.Float16Array(t.buffer,t.byteOffset,t.length);else throw new TypeError(`A ${a} tensor's data must be type of ${p}`)}else if(u=t,Array.isArray(e)){if(e.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let p=typeof e[0];if(p==="string")a="string",o=e;else if(p==="boolean")a="bool",o=Uint8Array.from(e);else throw new TypeError(`Invalid element type of data array: ${p}.`)}else if(e instanceof Uint8ClampedArray)a="uint8",o=Uint8Array.from(e);else{let p=oi.get(e.constructor);if(p===void 0)throw new TypeError(`Unsupported type for tensor data: ${e.constructor}.`);a=p,o=e}if(u===void 0)u=[o.length];else if(!Array.isArray(u))throw new TypeError("A tensor's dims must be a number array");n=u,this.cpuData=o,this.dataLocation="cpu"}let r=dd(n);if(this.cpuData&&r!==this.cpuData.length&&!((a==="uint4"||a==="int4")&&Math.ceil(r/2)===this.cpuData.length))throw new Error(`Tensor's size(${r}) does not match data length(${this.cpuData.length}).`);this.type=a,this.dims=n,this.size=r}static async fromImage(e,t){return ad(e,t)}static fromTexture(e,t){return nd(e,t)}static fromGpuBuffer(e,t){return sd(e,t)}static fromMLTensor(e,t){return od(e,t)}static fromPinnedBuffer(e,t,i){return ud(e,t,i)}toDataURL(e){return id(this,e)}toImageData(e){return rd(this,e)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(e){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let t=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=t,e&&this.disposer&&(this.disposer(),this.disposer=void 0),t}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(e){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return pd(this,e)}}}),et,cd=q(()=>{Oa(),et=Ue}),Ui,wr,tt,Ze,Ot,Rt,fd=q(()=>{td(),Ui=(e,t)=>{(typeof Ie.trace>"u"?!Ie.wasm.trace:!Ie.trace)||console.timeStamp(`${e}::ORT::${t}`)},wr=(e,t)=>{var n;let i=((n=new Error().stack)==null?void 0:n.split(/\r\n|\r|\n/g))||[],a=!1;for(let r=0;r<i.length;r++){if(a&&!i[r].includes("TRACE_FUNC")){let o=`FUNC_${e}::${i[r].trim().split(" ")[1]}`;t&&(o+=`::${t}`),Ui("CPU",o);return}i[r].includes("TRACE_FUNC")&&(a=!0)}},tt=e=>{(typeof Ie.trace>"u"?!Ie.wasm.trace:!Ie.trace)||wr("BEGIN",e)},Ze=e=>{(typeof Ie.trace>"u"?!Ie.wasm.trace:!Ie.trace)||wr("END",e)},Ot=e=>{(typeof Ie.trace>"u"?!Ie.wasm.trace:!Ie.trace)||console.time(`ORT::${e}`)},Rt=e=>{(typeof Ie.trace>"u"?!Ie.wasm.trace:!Ie.trace)||console.timeEnd(`ORT::${e}`)}}),hd,_m=q(()=>{Jl(),cd(),fd(),hd=class md{constructor(t){this.handler=t}async run(t,i,a){tt(),Ot("InferenceSession.run");let n={},r={};if(typeof t!="object"||t===null||t instanceof et||Array.isArray(t))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let o=!0;if(typeof i=="object"){if(i===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(i instanceof et)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(i)){if(i.length===0)throw new TypeError("'fetches' cannot be an empty array.");o=!1;for(let d of i){if(typeof d!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(d)===-1)throw new RangeError(`'fetches' contains invalid output name: ${d}.`);n[d]=null}if(typeof a=="object"&&a!==null)r=a;else if(typeof a<"u")throw new TypeError("'options' must be an object.")}else{let d=!1,f=Object.getOwnPropertyNames(i);for(let m of this.outputNames)if(f.indexOf(m)!==-1){let g=i[m];(g===null||g instanceof et)&&(d=!0,o=!1,n[m]=g)}if(d){if(typeof a=="object"&&a!==null)r=a;else if(typeof a<"u")throw new TypeError("'options' must be an object.")}else r=i}}else if(typeof i<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let d of this.inputNames)if(typeof t[d]>"u")throw new Error(`input '${d}' is missing in 'feeds'.`);if(o)for(let d of this.outputNames)n[d]=null;let u=await this.handler.run(t,n,r),p={};for(let d in u)if(Object.hasOwnProperty.call(u,d)){let f=u[d];f instanceof et?p[d]=f:p[d]=new et(f.type,f.data,f.dims)}return Rt("InferenceSession.run"),Ze(),p}async release(){return this.handler.dispose()}static async create(t,i,a,n){tt(),Ot("InferenceSession.create");let r,o={};if(typeof t=="string"){if(r=t,typeof i=="object"&&i!==null)o=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof Uint8Array){if(r=t,typeof i=="object"&&i!==null)o=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&t instanceof SharedArrayBuffer){let f=t,m=0,g=t.byteLength;if(typeof i=="object"&&i!==null)o=i;else if(typeof i=="number"){if(m=i,!Number.isSafeInteger(m))throw new RangeError("'byteOffset' must be an integer.");if(m<0||m>=f.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${f.byteLength}).`);if(g=t.byteLength-m,typeof a=="number"){if(g=a,!Number.isSafeInteger(g))throw new RangeError("'byteLength' must be an integer.");if(g<=0||m+g>f.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${f.byteLength-m}].`);if(typeof n=="object"&&n!==null)o=n;else if(typeof n<"u")throw new TypeError("'options' must be an object.")}else if(typeof a<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof i<"u")throw new TypeError("'options' must be an object.");r=new Uint8Array(f,m,g)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[u,p]=await Ql(o),d=await u.createInferenceSessionHandler(r,p);return Rt("InferenceSession.create"),Ze(),new md(d)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}get inputMetadata(){return this.handler.inputMetadata}get outputMetadata(){return this.handler.outputMetadata}}}),gd,ym=q(()=>{_m(),gd=hd}),bm=q(()=>{}),wm=q(()=>{}),$m=q(()=>{}),vm=q(()=>{}),_d={};Gt(_d,{InferenceSession:()=>gd,TRACE:()=>Ui,TRACE_EVENT_BEGIN:()=>Ot,TRACE_EVENT_END:()=>Rt,TRACE_FUNC_BEGIN:()=>tt,TRACE_FUNC_END:()=>Ze,Tensor:()=>et,env:()=>be,registerBackend:()=>Wt});var Le=q(()=>{dm(),cm(),ym(),cd(),bm(),wm(),fd(),$m(),vm()}),Ra=q(()=>{}),yd={};Gt(yd,{default:()=>bd});var $r,vr,bd,xm=q(()=>{var e;Tf(),Mt(),Ba(),$r="ort-wasm-proxy-worker",vr=((e=globalThis.self)==null?void 0:e.name)===$r,vr&&(self.onmessage=t=>{let{type:i,in:a}=t.data;try{switch(i){case"init-wasm":Na(a.wasm).then(()=>{Qa(a).then(()=>{postMessage({type:i})},n=>{postMessage({type:i,err:n})})},n=>{postMessage({type:i,err:n})});break;case"init-ep":{let{epName:n,env:r}=a;Ja(r,n).then(()=>{postMessage({type:i})},o=>{postMessage({type:i,err:o})});break}case"copy-from":{let{buffer:n}=a,r=Hi(n);postMessage({type:i,out:r});break}case"create":{let{model:n,options:r}=a;en(n,r).then(o=>{postMessage({type:i,out:o})},o=>{postMessage({type:i,err:o})});break}case"release":tn(a),postMessage({type:i});break;case"run":{let{sessionId:n,inputIndices:r,inputs:o,outputIndices:u,options:p}=a;rn(n,r,o,u,new Array(u.length).fill(null),p).then(d=>{d.some(f=>f[3]!=="cpu")?postMessage({type:i,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:i,out:d},nn([...o,...d]))},d=>{postMessage({type:i,err:d})});break}case"end-profiling":an(a),postMessage({type:i});break;default:}}catch(n){postMessage({type:i,err:n})}}),bd=vr?null:t=>new Worker(t??Pe,{type:"module",name:$r})}),wd={};Gt(wd,{default:()=>$d});var xr,$d,ws,Cm=q(()=>{var e,t;xr=async function(i={}){var _s;var a,n,r=i,o=new Promise((s,l)=>{a=s,n=l}),u=typeof window=="object",p=typeof WorkerGlobalScope<"u",d=p&&((_s=self.name)==null?void 0:_s.startsWith("em-pthread"));r.mountExternalData=(s,l)=>{s.startsWith("./")&&(s=s.substring(2)),(r.Fb||(r.Fb=new Map)).set(s,l)},r.unmountExternalData=()=>{delete r.Fb};var f=globalThis.SharedArrayBuffer??new WebAssembly.Memory({initial:0,maximum:0,qc:!0}).buffer.constructor;let m=s=>async(...l)=>{var c;try{if(r.Gb)throw Error("Session already started");let h=r.Gb={ec:l[0],errors:[]},y=await s(...l);if(r.Gb!==h)throw Error("Session mismatch");(c=r.Kb)==null||c.flush();let x=h.errors;if(0<x.length){let I=await Promise.all(x);if(I=I.filter(A=>A),0<I.length)throw Error(I.join(`
`))}return y}finally{r.Gb=null}};r.jsepInit=(s,l)=>{if(s==="webgpu"){[r.Kb,r.Vb,r.Zb,r.Lb,r.Yb,r.Ab,r.$b,r.bc,r.Wb,r.Xb,r.ac]=l;let c=r.Kb;r.jsepRegisterBuffer=(h,y,x,I)=>c.registerBuffer(h,y,x,I),r.jsepGetBuffer=h=>c.getBuffer(h),r.jsepCreateDownloader=(h,y,x)=>c.createDownloader(h,y,x),r.jsepOnCreateSession=h=>{c.onCreateSession(h)},r.jsepOnReleaseSession=h=>{c.onReleaseSession(h)},r.jsepOnRunStart=h=>c.onRunStart(h),r.cc=(h,y)=>{c.upload(h,y)}}else if(s==="webnn"){let c=l[0];[r.oc,r.Ob,r.webnnEnsureTensor,r.Pb,r.webnnDownloadTensor,r.nc,r.webnnEnableTraceEvent]=l.slice(1),r.webnnReleaseTensorId=r.Ob,r.webnnUploadTensor=r.Pb,r.webnnRegisterMLContext=r.nc,r.webnnOnRunStart=h=>c.onRunStart(h),r.webnnOnRunEnd=c.onRunEnd.bind(c),r.webnnOnReleaseSession=h=>{c.onReleaseSession(h)},r.webnnCreateMLTensorDownloader=(h,y)=>c.createMLTensorDownloader(h,y),r.webnnRegisterMLTensor=(h,y,x,I)=>c.registerMLTensor(h,y,x,I),r.webnnCreateMLContext=h=>c.createMLContext(h),r.webnnRegisterMLConstant=(h,y,x,I,A,P)=>c.registerMLConstant(h,y,x,I,A,r.Fb,P),r.webnnRegisterGraphInput=c.registerGraphInput.bind(c),r.webnnIsGraphInput=c.isGraphInput.bind(c),r.webnnRegisterGraphOutput=c.registerGraphOutput.bind(c),r.webnnIsGraphOutput=c.isGraphOutput.bind(c),r.webnnCreateTemporaryTensor=c.createTemporaryTensor.bind(c),r.webnnIsGraphInputOutputTypeSupported=c.isGraphInputOutputTypeSupported.bind(c)}};let g=()=>{let s=(l,c,h)=>(...y)=>{let x=Qe,I=c==null?void 0:c();y=l(...y);let A=c==null?void 0:c();return I!==A&&(l=A,h(I),c=h=null),Qe!=x?new Promise((P,W)=>{or={resolve:P,reject:W}}):y};(()=>{for(let l of["_OrtAppendExecutionProvider","_OrtCreateSession","_OrtRun","_OrtRunWithBinding","_OrtBindInput"])r[l]=s(r[l],()=>r[l],c=>r[l]=c)})(),m!==void 0&&(r._OrtRun=m(r._OrtRun),r._OrtRunWithBinding=m(r._OrtRunWithBinding)),g=void 0};r.asyncInit=()=>{g==null||g()};var _,b,w=(s,l)=>{throw l},C=import.meta.url,v="";if(u||p){try{v=new URL(".",C).href}catch{}p&&(b=s=>{var l=new XMLHttpRequest;return l.open("GET",s,!1),l.responseType="arraybuffer",l.send(null),new Uint8Array(l.response)}),_=async s=>{if(V(s))return new Promise((c,h)=>{var y=new XMLHttpRequest;y.open("GET",s,!0),y.responseType="arraybuffer",y.onload=()=>{y.status==200||y.status==0&&y.response?c(y.response):h(y.status)},y.onerror=h,y.send(null)});var l=await fetch(s,{credentials:"same-origin"});if(l.ok)return l.arrayBuffer();throw Error(l.status+" : "+l.url)}}var $,T,k,S,E,z,R,M,L,J,H,j,le,ae,Z,se=console.log.bind(console),Y=console.error.bind(console),te=se,ge=Y,D=!1,V=s=>s.startsWith("file://");function G(){return T.buffer!=E.buffer&&he(),E}function ee(){return T.buffer!=E.buffer&&he(),z}function Te(){return T.buffer!=E.buffer&&he(),R}function Ye(){return T.buffer!=E.buffer&&he(),M}function U(){return T.buffer!=E.buffer&&he(),L}function _e(){return T.buffer!=E.buffer&&he(),J}function Ne(){return T.buffer!=E.buffer&&he(),H}function Ae(){return T.buffer!=E.buffer&&he(),ae}if(d){let s=function(l){try{var c=l.data,h=c.Db;if(h==="load"){let y=[];self.onmessage=x=>y.push(x),self.startWorker=()=>{postMessage({Db:"loaded"});for(let x of y)s(x);self.onmessage=s};for(let x of c.Sb)r[x]&&!r[x].proxy||(r[x]=(...I)=>{postMessage({Db:"callHandler",Rb:x,args:I})},x=="print"&&(te=r[x]),x=="printErr"&&(ge=r[x]));T=c.kc,he(),Z(c.lc)}else if(h==="run"){Mf(c.Bb),fr(c.Bb,0,0,1,0,0),fn(),nr(c.Bb),it||(ns(),it=!0);try{Pf(c.hc,c.Jb)}catch(y){if(y!="unwind")throw y}}else c.target!=="setimmediate"&&(h==="checkMailbox"?it&&hi():h&&(ge(`worker: received unknown command ${h}`),ge(c)))}catch(y){throw ss(),y}};var it=!1;self.onunhandledrejection=l=>{throw l.reason||l},self.onmessage=s}function he(){var s=T.buffer;r.HEAP8=E=new Int8Array(s),R=new Int16Array(s),r.HEAPU8=z=new Uint8Array(s),M=new Uint16Array(s),r.HEAP32=L=new Int32Array(s),r.HEAPU32=J=new Uint32Array(s),H=new Float32Array(s),ae=new Float64Array(s),j=new BigInt64Array(s),le=new BigUint64Array(s)}function $e(){d?startWorker(r):B.Da()}var De,wt=0,$t=null;function sn(){if(--wt==0&&$t){var s=$t;$t=null,s()}}function dt(s){throw ge(s="Aborted("+s+")"),D=!0,s=new WebAssembly.RuntimeError(s+". Build with -sASSERTIONS for more info."),n(s),s}function on(){return{a:{L:tm,Aa:em,b:qf,$:_n,A:wn,pa:$n,X:vn,Z:xn,qa:Cn,na:Tn,ga:kn,ma:Sn,J:In,Y:En,V:zn,oa:An,W:On,va:Wf,E:Lf,Q:Vf,O:Gf,D:Ff,v:Kf,s:Zf,P:Yf,z:rh,R:ah,ja:nh,T:sh,aa:oh,M:uh,F:lh,ia:nr,sa:dh,r:ph,Ca:ch,w:mh,o:gh,m:yh,c:tr,Ba:bh,n:wh,j:xh,u:Ch,p:Th,f:kh,t:Sh,l:Ih,e:Eh,k:zh,h:Ah,g:Oh,d:Rh,da:Bh,ea:Nh,fa:Dh,ba:Gn,ca:Hn,N:Fn,xa:Ph,ua:qh,i:Wh,C:Lh,G:Vh,ta:Uh,x:jh,ra:Gh,U:Hh,q:Mh,y:Fh,K:Kh,S:Zh,za:Yh,ya:Xh,ka:Xn,la:Qn,_:Xi,B:Jn,I:es,ha:ts,H:is,a:T,wa:Yi}}}class Ki{constructor(l){ys(this,"name","ExitStatus");this.message=`Program terminated with exit(${l})`,this.status=l}}var un=s=>{s.terminate(),s.onmessage=()=>{}},Zi=[],ln=s=>{ct.length==0&&(mn(),hn(ct[0]));var l=ct.pop();if(!l)return 6;Ht.push(l),vt[s.Bb]=l,l.Bb=s.Bb;var c={Db:"run",hc:s.fc,Jb:s.Jb,Bb:s.Bb};return l.postMessage(c,s.Nb),0},pt=0,we=(s,l,...c)=>{for(var h=2*c.length,y=gr(),x=mr(8*h),I=x>>>3,A=0;A<c.length;A++){var P=c[A];typeof P=="bigint"?(j[I+2*A]=1n,j[I+2*A+1]=P):(j[I+2*A]=0n,Ae()[I+2*A+1>>>0]=P)}return s=os(s,0,h,x,l),xi(y),s};function Yi(s){if(d)return we(0,1,s);if(S=s,!(0<pt)){for(var l of Ht)un(l);for(l of ct)un(l);ct=[],Ht=[],vt={},D=!0}w(0,new Ki(s))}function dn(s){if(d)return we(1,0,s);Xi(s)}var Xi=s=>{if(S=s,d)throw dn(s),"unwind";Yi(s)},ct=[],Ht=[],pn=[],vt={},cn=s=>{var l=s.Bb;delete vt[l],ct.push(s),Ht.splice(Ht.indexOf(s),1),s.Bb=0,us(l)};function fn(){pn.forEach(s=>s())}var hn=s=>new Promise(l=>{s.onmessage=y=>{var x=(y=y.data).Db;if(y.Hb&&y.Hb!=cr()){var I=vt[y.Hb];I?I.postMessage(y,y.Nb):ge(`Internal error! Worker sent a message "${x}" to target pthread ${y.Hb}, but that thread no longer exists!`)}else x==="checkMailbox"?hi():x==="spawnThread"?ln(y):x==="cleanupThread"?cn(vt[y.ic]):x==="loaded"?(s.loaded=!0,l(s)):y.target==="setimmediate"?s.postMessage(y):x==="callHandler"?r[y.Rb](...y.args):x&&ge(`worker sent an unknown command ${x}`)},s.onerror=y=>{throw ge(`worker sent an error! ${y.filename}:${y.lineno}: ${y.message}`),y};var c,h=[];for(c of[])r.propertyIsEnumerable(c)&&h.push(c);s.postMessage({Db:"load",Sb:h,kc:T,lc:k})});function mn(){var s=new Worker((()=>{let l=URL;return import.meta.url>"file:"&&import.meta.url<"file;"?new l("ort.bundle.min.mjs",import.meta.url):new URL(import.meta.url)})(),{type:"module",workerData:"em-pthread",name:"em-pthread"});ct.push(s)}var Mf=s=>{he();var l=_e()[s+52>>>2>>>0];s=_e()[s+56>>>2>>>0],ps(l,l-s),xi(l)},Pf=(s,l)=>{pt=0,s=cs(s,l),0<pt?S=s:hr(s)};class Uf{constructor(l){this.Ib=l-24}}function qf(s,l,c){var h=new Uf(s>>>=0);throw l>>>=0,c>>>=0,_e()[h.Ib+16>>>2>>>0]=0,_e()[h.Ib+4>>>2>>>0]=l,_e()[h.Ib+8>>>2>>>0]=c,s}function gn(s,l,c,h){return d?we(2,1,s,l,c,h):_n(s,l,c,h)}function _n(s,l,c,h){if(s>>>=0,c>>>=0,h>>>=0,f===void 0)return 6;var y=[];return d&&y.length===0?gn(s,l>>>=0,c,h):(s={fc:c,Bb:s,Jb:h,Nb:y},d?(s.Db="spawnThread",postMessage(s,y),0):ln(s))}var yn=typeof TextDecoder<"u"?new TextDecoder:void 0,bn=(s,l=0,c=NaN)=>{var h=(l>>>=0)+c;for(c=l;s[c]&&!(c>=h);)++c;if(16<c-l&&s.buffer&&yn)return yn.decode(s.buffer instanceof ArrayBuffer?s.subarray(l,c):s.slice(l,c));for(h="";l<c;){var y=s[l++];if(128&y){var x=63&s[l++];if((224&y)==192)h+=String.fromCharCode((31&y)<<6|x);else{var I=63&s[l++];65536>(y=(240&y)==224?(15&y)<<12|x<<6|I:(7&y)<<18|x<<12|I<<6|63&s[l++])?h+=String.fromCharCode(y):(y-=65536,h+=String.fromCharCode(55296|y>>10,56320|1023&y))}}else h+=String.fromCharCode(y)}return h},Ce=(s,l)=>(s>>>=0)?bn(ee(),s,l):"";function wn(s,l,c){return d?we(3,1,s,l,c):0}function $n(s,l){if(d)return we(4,1,s,l)}function vn(s,l){if(d)return we(5,1,s,l)}function xn(s,l,c){if(d)return we(6,1,s,l,c)}function Cn(s,l,c){return d?we(7,1,s,l,c):0}function Tn(s,l){if(d)return we(8,1,s,l)}function kn(s,l,c){if(d)return we(9,1,s,l,c)}function Sn(s,l,c,h){if(d)return we(10,1,s,l,c,h)}function In(s,l,c,h){if(d)return we(11,1,s,l,c,h)}function En(s,l,c,h){if(d)return we(12,1,s,l,c,h)}function zn(s){if(d)return we(13,1,s)}function An(s,l){if(d)return we(14,1,s,l)}function On(s,l,c){if(d)return we(15,1,s,l,c)}var Rn,Wf=()=>dt(""),Xe=s=>{for(var l="";ee()[s>>>0];)l+=Rn[ee()[s++>>>0]];return l},Qi={},Ji={},Ut=r.BindingError=class extends Error{constructor(s){super(s),this.name="BindingError"}};function rt(s,l,c={}){return function(h,y,x={}){var I=y.name;if(!h)throw new Ut(`type "${I}" must have a positive integer typeid pointer`);if(Ji.hasOwnProperty(h)){if(x.Tb)return;throw new Ut(`Cannot register type '${I}' twice`)}Ji[h]=y,Qi.hasOwnProperty(h)&&(y=Qi[h],delete Qi[h],y.forEach(A=>A()))}(s,l,c)}var Bn=(s,l,c)=>{switch(l){case 1:return c?h=>G()[h>>>0]:h=>ee()[h>>>0];case 2:return c?h=>Te()[h>>>1>>>0]:h=>Ye()[h>>>1>>>0];case 4:return c?h=>U()[h>>>2>>>0]:h=>_e()[h>>>2>>>0];case 8:return c?h=>j[h>>>3]:h=>le[h>>>3];default:throw new TypeError(`invalid integer width (${l}): ${s}`)}};function Lf(s,l,c){c>>>=0,rt(s>>>=0,{name:l=Xe(l>>>0),fromWireType:h=>h,toWireType:function(h,y){if(typeof y!="bigint"&&typeof y!="number")throw y=y===null?"null":(h=typeof y)=="object"||h==="array"||h==="function"?y.toString():""+y,new TypeError(`Cannot convert "${y}" to ${this.name}`);return typeof y=="number"&&(y=BigInt(y)),y},Cb:ft,readValueFromPointer:Bn(l,c,l.indexOf("u")==-1),Eb:null})}var ft=8;function Vf(s,l,c,h){rt(s>>>=0,{name:l=Xe(l>>>0),fromWireType:function(y){return!!y},toWireType:function(y,x){return x?c:h},Cb:ft,readValueFromPointer:function(y){return this.fromWireType(ee()[y>>>0])},Eb:null})}var er=[],at=[];function tr(s){9<(s>>>=0)&&--at[s+1]==0&&(at[s]=void 0,er.push(s))}var Oe=s=>{if(!s)throw new Ut(`Cannot use deleted val. handle = ${s}`);return at[s]},We=s=>{switch(s){case void 0:return 2;case null:return 4;case!0:return 6;case!1:return 8;default:let l=er.pop()||at.length;return at[l]=s,at[l+1]=1,l}};function ir(s){return this.fromWireType(_e()[s>>>2>>>0])}var jf={name:"emscripten::val",fromWireType:s=>{var l=Oe(s);return tr(s),l},toWireType:(s,l)=>We(l),Cb:ft,readValueFromPointer:ir,Eb:null};function Gf(s){return rt(s>>>0,jf)}var Hf=(s,l)=>{switch(l){case 4:return function(c){return this.fromWireType(Ne()[c>>>2>>>0])};case 8:return function(c){return this.fromWireType(Ae()[c>>>3>>>0])};default:throw new TypeError(`invalid float width (${l}): ${s}`)}};function Ff(s,l,c){c>>>=0,rt(s>>>=0,{name:l=Xe(l>>>0),fromWireType:h=>h,toWireType:(h,y)=>y,Cb:ft,readValueFromPointer:Hf(l,c),Eb:null})}function Kf(s,l,c,h,y){if(s>>>=0,c>>>=0,l=Xe(l>>>0),y===-1&&(y=4294967295),y=A=>A,h===0){var x=32-8*c;y=A=>A<<x>>>x}var I=l.includes("unsigned")?function(A,P){return P>>>0}:function(A,P){return P};rt(s,{name:l,fromWireType:y,toWireType:I,Cb:ft,readValueFromPointer:Bn(l,c,h!==0),Eb:null})}function Zf(s,l,c){function h(x){var I=_e()[x>>>2>>>0];return x=_e()[x+4>>>2>>>0],new y(G().buffer,x,I)}var y=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array][l];rt(s>>>=0,{name:c=Xe(c>>>0),fromWireType:h,Cb:ft,readValueFromPointer:h},{Tb:!0})}var xt=(s,l,c)=>{var h=ee();if(l>>>=0,0<c){var y=l;c=l+c-1;for(var x=0;x<s.length;++x){var I=s.charCodeAt(x);if(55296<=I&&57343>=I&&(I=65536+((1023&I)<<10)|1023&s.charCodeAt(++x)),127>=I){if(l>=c)break;h[l++>>>0]=I}else{if(2047>=I){if(l+1>=c)break;h[l++>>>0]=192|I>>6}else{if(65535>=I){if(l+2>=c)break;h[l++>>>0]=224|I>>12}else{if(l+3>=c)break;h[l++>>>0]=240|I>>18,h[l++>>>0]=128|I>>12&63}h[l++>>>0]=128|I>>6&63}h[l++>>>0]=128|63&I}}h[l>>>0]=0,s=l-y}else s=0;return s},rr=s=>{for(var l=0,c=0;c<s.length;++c){var h=s.charCodeAt(c);127>=h?l++:2047>=h?l+=2:55296<=h&&57343>=h?(l+=4,++c):l+=3}return l};function Yf(s,l){rt(s>>>=0,{name:l=Xe(l>>>0),fromWireType:function(c){for(var h,y=_e()[c>>>2>>>0],x=c+4,I=x,A=0;A<=y;++A){var P=x+A;A!=y&&ee()[P>>>0]!=0||(I=Ce(I,P-I),h===void 0?h=I:(h+="\0",h+=I),I=P+1)}return nt(c),h},toWireType:function(c,h){h instanceof ArrayBuffer&&(h=new Uint8Array(h));var y=typeof h=="string";if(!(y||ArrayBuffer.isView(h)&&h.BYTES_PER_ELEMENT==1))throw new Ut("Cannot pass non-string to std::string");var x=y?rr(h):h.length,I=vi(4+x+1),A=I+4;return _e()[I>>>2>>>0]=x,y?xt(h,A,x+1):ee().set(h,A>>>0),c!==null&&c.push(nt,I),I},Cb:ft,readValueFromPointer:ir,Eb(c){nt(c)}})}var Nn=typeof TextDecoder<"u"?new TextDecoder("utf-16le"):void 0,Xf=(s,l)=>{for(var c=s>>1,h=c+l/2;!(c>=h)&&Ye()[c>>>0];)++c;if(32<(c<<=1)-s&&Nn)return Nn.decode(ee().slice(s,c));for(c="",h=0;!(h>=l/2);++h){var y=Te()[s+2*h>>>1>>>0];if(y==0)break;c+=String.fromCharCode(y)}return c},Qf=(s,l,c)=>{if(c??(c=2147483647),2>c)return 0;var h=l;c=(c-=2)<2*s.length?c/2:s.length;for(var y=0;y<c;++y){var x=s.charCodeAt(y);Te()[l>>>1>>>0]=x,l+=2}return Te()[l>>>1>>>0]=0,l-h},Jf=s=>2*s.length,eh=(s,l)=>{for(var c=0,h="";!(c>=l/4);){var y=U()[s+4*c>>>2>>>0];if(y==0)break;++c,65536<=y?(y-=65536,h+=String.fromCharCode(55296|y>>10,56320|1023&y)):h+=String.fromCharCode(y)}return h},th=(s,l,c)=>{if(l>>>=0,c??(c=2147483647),4>c)return 0;var h=l;c=h+c-4;for(var y=0;y<s.length;++y){var x=s.charCodeAt(y);if(55296<=x&&57343>=x&&(x=65536+((1023&x)<<10)|1023&s.charCodeAt(++y)),U()[l>>>2>>>0]=x,(l+=4)+4>c)break}return U()[l>>>2>>>0]=0,l-h},ih=s=>{for(var l=0,c=0;c<s.length;++c){var h=s.charCodeAt(c);55296<=h&&57343>=h&&++c,l+=4}return l};function rh(s,l,c){if(s>>>=0,l>>>=0,c=Xe(c>>>=0),l===2)var h=Xf,y=Qf,x=Jf,I=A=>Ye()[A>>>1>>>0];else l===4&&(h=eh,y=th,x=ih,I=A=>_e()[A>>>2>>>0]);rt(s,{name:c,fromWireType:A=>{for(var P,W=_e()[A>>>2>>>0],F=A+4,ie=0;ie<=W;++ie){var ue=A+4+ie*l;ie!=W&&I(ue)!=0||(F=h(F,ue-F),P===void 0?P=F:(P+="\0",P+=F),F=ue+l)}return nt(A),P},toWireType:(A,P)=>{if(typeof P!="string")throw new Ut(`Cannot pass non-string to C++ string type ${c}`);var W=x(P),F=vi(4+W+l);return _e()[F>>>2>>>0]=W/l,y(P,F+4,W+l),A!==null&&A.push(nt,F),F},Cb:ft,readValueFromPointer:ir,Eb(A){nt(A)}})}function ah(s,l){rt(s>>>=0,{Ub:!0,name:l=Xe(l>>>0),Cb:0,fromWireType:()=>{},toWireType:()=>{}})}function nh(s){fr(s>>>0,!p,1,!u,131072,!1),fn()}var ar=s=>{if(!D)try{if(s(),!(0<pt))try{d?hr(S):Xi(S)}catch(l){l instanceof Ki||l=="unwind"||w(0,l)}}catch(l){l instanceof Ki||l=="unwind"||w(0,l)}};function nr(s){s>>>=0,typeof Atomics.jc=="function"&&(Atomics.jc(U(),s>>>2,s).value.then(hi),s+=128,Atomics.store(U(),s>>>2,1))}var hi=()=>{var s=cr();s&&(nr(s),ar(ds))};function sh(s,l){(s>>>=0)==l>>>0?setTimeout(hi):d?postMessage({Hb:s,Db:"checkMailbox"}):(s=vt[s])&&s.postMessage({Db:"checkMailbox"})}var sr=[];function oh(s,l,c,h,y){for(l>>>=0,h/=2,sr.length=h,c=y>>>0>>>3,y=0;y<h;y++)sr[y]=j[c+2*y]?j[c+2*y+1]:Ae()[c+2*y+1>>>0];return(l?pr[l]:Jh[s])(...sr)}var uh=()=>{pt=0};function lh(s){s>>>=0,d?postMessage({Db:"cleanupThread",ic:s}):cn(vt[s])}function dh(s){}var mi=(s,l)=>{var c=Ji[s];if(c===void 0)throw s=as(s),c=Xe(s),nt(s),new Ut(`${l} has unknown type ${c}`);return c},Dn=(s,l,c)=>{var h=[];return s=s.toWireType(h,c),h.length&&(_e()[l>>>2>>>0]=We(h)),s};function ph(s,l,c){return l>>>=0,c>>>=0,s=Oe(s>>>0),l=mi(l,"emval::as"),Dn(l,c,s)}function ch(s,l){return l>>>=0,s=Oe(s>>>0),(l=mi(l,"emval::as")).toWireType(null,s)}var gi=s=>{try{s()}catch(l){dt(l)}},ht=0,Qe=null,Mn=0,_i=[],Pn={},Un={},fh=0,or=null,hh=[];function qn(s){return function(l){if(!D){if(ht===0){var c=!1,h=!1;l((y=0)=>{if(!D&&(Mn=y,c=!0,h)){ht=2,gi(()=>ms(Qe)),typeof MainLoop<"u"&&MainLoop.Qb&&MainLoop.resume(),y=!1;try{var x=function(){var P=U()[Qe+8>>>2>>>0];return P=B[Un[P]],--pt,P()}()}catch(P){x=P,y=!0}var I=!1;if(!Qe){var A=or;A&&(or=null,(y?A.reject:A.resolve)(x),I=!0)}if(y&&!I)throw x}}),h=!0,c||(ht=1,Qe=function(){var y=vi(65548),x=y+12;_e()[y>>>2>>>0]=x,_e()[y+4>>>2>>>0]=x+65536,x=_i[0];var I=Pn[x];return I===void 0&&(I=fh++,Pn[x]=I,Un[I]=x),x=I,U()[y+8>>>2>>>0]=x,y}(),typeof MainLoop<"u"&&MainLoop.Qb&&MainLoop.pause(),gi(()=>fs(Qe)))}else ht===2?(ht=0,gi(gs),nt(Qe),Qe=null,hh.forEach(ar)):dt(`invalid state: ${ht}`);return Mn}}(l=>{s().then(l)})}function mh(s){return s>>>=0,qn(async()=>{var l=await Oe(s);return We(l)})}var yi=[];function gh(s,l,c,h){return c>>>=0,h>>>=0,(s=yi[s>>>0])(null,l=Oe(l>>>0),c,h)}var _h={},bi=s=>{var l=_h[s];return l===void 0?Xe(s):l};function yh(s,l,c,h,y){return c>>>=0,h>>>=0,y>>>=0,(s=yi[s>>>0])(l=Oe(l>>>0),l[c=bi(c)],h,y)}function bh(s,l){return l>>>=0,(s=Oe(s>>>0))==Oe(l)}var Wn=()=>typeof globalThis=="object"?globalThis:Function("return this")();function wh(s){return(s>>>=0)==0?We(Wn()):(s=bi(s),We(Wn()[s]))}var $h=s=>{var l=yi.length;return yi.push(s),l},vh=(s,l)=>{for(var c=Array(s),h=0;h<s;++h)c[h]=mi(_e()[l+4*h>>>2>>>0],`parameter ${h}`);return c};function xh(s,l,c){var h=(l=vh(s,l>>>0)).shift();s--;var y=`return function (obj, func, destructorsRef, args) {
`,x=0,I=[];c===0&&I.push("obj");for(var A=["retType"],P=[h],W=0;W<s;++W)I.push(`arg${W}`),A.push(`argType${W}`),P.push(l[W]),y+=`  var arg${W} = argType${W}.readValueFromPointer(args${x?"+"+x:""});
`,x+=l[W].Cb;return y+=`  var rv = ${c===1?"new func":"func.call"}(${I.join(", ")});
`,h.Ub||(A.push("emval_returnValue"),P.push(Dn),y+=`  return emval_returnValue(retType, destructorsRef, rv);
`),s=new Function(...A,y+`};
`)(...P),c=`methodCaller<(${l.map(F=>F.name).join(", ")}) => ${h.name}>`,$h(Object.defineProperty(s,"name",{value:c}))}function Ch(s){return s=bi(s>>>0),We(r[s])}function Th(s,l){return l>>>=0,s=Oe(s>>>0),l=Oe(l),We(s[l])}function kh(s){9<(s>>>=0)&&(at[s+1]+=1)}function Sh(){return We([])}function Ih(s){s=Oe(s>>>0);for(var l=Array(s.length),c=0;c<s.length;c++)l[c]=s[c];return We(l)}function Eh(s){return We(bi(s>>>0))}function zh(){return We({})}function Ah(s){for(var l=Oe(s>>>=0);l.length;){var c=l.pop();l.pop()(c)}tr(s)}function Oh(s,l,c){l>>>=0,c>>>=0,s=Oe(s>>>0),l=Oe(l),c=Oe(c),s[l]=c}function Rh(s,l){return l>>>=0,s=(s=mi(s>>>0,"_emval_take_value")).readValueFromPointer(l),We(s)}function Bh(s,l){s=-9007199254740992>s||9007199254740992<s?NaN:Number(s),l>>>=0,s=new Date(1e3*s),U()[l>>>2>>>0]=s.getUTCSeconds(),U()[l+4>>>2>>>0]=s.getUTCMinutes(),U()[l+8>>>2>>>0]=s.getUTCHours(),U()[l+12>>>2>>>0]=s.getUTCDate(),U()[l+16>>>2>>>0]=s.getUTCMonth(),U()[l+20>>>2>>>0]=s.getUTCFullYear()-1900,U()[l+24>>>2>>>0]=s.getUTCDay(),s=(s.getTime()-Date.UTC(s.getUTCFullYear(),0,1,0,0,0,0))/864e5|0,U()[l+28>>>2>>>0]=s}var Ln=s=>s%4==0&&(s%100!=0||s%400==0),Vn=[0,31,60,91,121,152,182,213,244,274,305,335],jn=[0,31,59,90,120,151,181,212,243,273,304,334];function Nh(s,l){s=-9007199254740992>s||9007199254740992<s?NaN:Number(s),l>>>=0,s=new Date(1e3*s),U()[l>>>2>>>0]=s.getSeconds(),U()[l+4>>>2>>>0]=s.getMinutes(),U()[l+8>>>2>>>0]=s.getHours(),U()[l+12>>>2>>>0]=s.getDate(),U()[l+16>>>2>>>0]=s.getMonth(),U()[l+20>>>2>>>0]=s.getFullYear()-1900,U()[l+24>>>2>>>0]=s.getDay();var c=(Ln(s.getFullYear())?Vn:jn)[s.getMonth()]+s.getDate()-1|0;U()[l+28>>>2>>>0]=c,U()[l+36>>>2>>>0]=-60*s.getTimezoneOffset(),c=new Date(s.getFullYear(),6,1).getTimezoneOffset();var h=new Date(s.getFullYear(),0,1).getTimezoneOffset();s=0|(c!=h&&s.getTimezoneOffset()==Math.min(h,c)),U()[l+32>>>2>>>0]=s}function Dh(s){s>>>=0;var l=new Date(U()[s+20>>>2>>>0]+1900,U()[s+16>>>2>>>0],U()[s+12>>>2>>>0],U()[s+8>>>2>>>0],U()[s+4>>>2>>>0],U()[s>>>2>>>0],0),c=U()[s+32>>>2>>>0],h=l.getTimezoneOffset(),y=new Date(l.getFullYear(),6,1).getTimezoneOffset(),x=new Date(l.getFullYear(),0,1).getTimezoneOffset(),I=Math.min(x,y);return 0>c?U()[s+32>>>2>>>0]=+(y!=x&&I==h):0<c!=(I==h)&&(y=Math.max(x,y),l.setTime(l.getTime()+6e4*((0<c?I:y)-h))),U()[s+24>>>2>>>0]=l.getDay(),c=(Ln(l.getFullYear())?Vn:jn)[l.getMonth()]+l.getDate()-1|0,U()[s+28>>>2>>>0]=c,U()[s>>>2>>>0]=l.getSeconds(),U()[s+4>>>2>>>0]=l.getMinutes(),U()[s+8>>>2>>>0]=l.getHours(),U()[s+12>>>2>>>0]=l.getDate(),U()[s+16>>>2>>>0]=l.getMonth(),U()[s+20>>>2>>>0]=l.getYear(),s=l.getTime(),BigInt(isNaN(s)?-1:s/1e3)}function Gn(s,l,c,h,y,x,I){return d?we(16,1,s,l,c,h,y,x,I):-52}function Hn(s,l,c,h,y,x){if(d)return we(17,1,s,l,c,h,y,x)}var Ft={},Mh=()=>performance.timeOrigin+performance.now();function Fn(s,l){if(d)return we(18,1,s,l);if(Ft[s]&&(clearTimeout(Ft[s].id),delete Ft[s]),!l)return 0;var c=setTimeout(()=>{delete Ft[s],ar(()=>ls(s,performance.timeOrigin+performance.now()))},l);return Ft[s]={id:c,rc:l},0}function Ph(s,l,c,h){s>>>=0,l>>>=0,c>>>=0,h>>>=0;var y=new Date().getFullYear(),x=new Date(y,0,1).getTimezoneOffset();y=new Date(y,6,1).getTimezoneOffset();var I=Math.max(x,y);_e()[s>>>2>>>0]=60*I,U()[l>>>2>>>0]=+(x!=y),s=(l=A=>{var P=Math.abs(A);return`UTC${0<=A?"-":"+"}${String(Math.floor(P/60)).padStart(2,"0")}${String(P%60).padStart(2,"0")}`})(x),l=l(y),y<x?(xt(s,c,17),xt(l,h,17)):(xt(s,h,17),xt(l,c,17))}var Uh=()=>Date.now();function qh(s,l,c){return 0<=s&&3>=s?(s===0?s=Date.now():s=performance.timeOrigin+performance.now(),j[c>>>0>>>3]=BigInt(Math.round(1e6*s)),0):28}var ur=[],Kn=(s,l)=>{ur.length=0;for(var c;c=ee()[s++>>>0];){var h=c!=105;l+=(h&=c!=112)&&l%8?4:0,ur.push(c==112?_e()[l>>>2>>>0]:c==106?j[l>>>3]:c==105?U()[l>>>2>>>0]:Ae()[l>>>3>>>0]),l+=h?8:4}return ur};function Wh(s,l,c){return s>>>=0,l=Kn(l>>>0,c>>>0),pr[s](...l)}function Lh(s,l,c){return s>>>=0,l=Kn(l>>>0,c>>>0),pr[s](...l)}var Vh=()=>{};function jh(s,l){return ge(Ce(s>>>0,l>>>0))}var Gh=()=>{throw pt+=1,"unwind"};function Hh(){return 4294901760}var Fh=()=>navigator.hardwareConcurrency;function Kh(){return dt("Cannot use emscripten_pc_get_function without -sUSE_OFFSET_CONVERTER"),0}function Zh(s){s>>>=0;var l=ee().length;if(s<=l||4294901760<s)return!1;for(var c=1;4>=c;c*=2){var h=l*(1+.2/c);h=Math.min(h,s+100663296);e:{h=(Math.min(4294901760,65536*Math.ceil(Math.max(s,h)/65536))-T.buffer.byteLength+65535)/65536|0;try{T.grow(h),he();var y=1;break e}catch{}y=void 0}if(y)return!0}return!1}var wi=()=>(dt("Cannot use convertFrameToPC (needed by __builtin_return_address) without -sUSE_OFFSET_CONVERTER"),0),Kt={},Zn=s=>{s.forEach(l=>{wi()})};function Yh(){var s=Error().stack.toString().split(`
`);return s[0]=="Error"&&s.shift(),Zn(s),Kt.Mb=wi(),Kt.dc=s,Kt.Mb}function Xh(s,l,c){if(s>>>=0,l>>>=0,Kt.Mb==s)var h=Kt.dc;else(h=Error().stack.toString().split(`
`))[0]=="Error"&&h.shift(),Zn(h);for(var y=3;h[y]&&wi()!=s;)++y;for(s=0;s<c&&h[s+y];++s)U()[l+4*s>>>2>>>0]=wi();return s}var lr,dr={},Yn=()=>{if(!lr){var s,l={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:(typeof navigator=="object"&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8",_:"./this.program"};for(s in dr)dr[s]===void 0?delete l[s]:l[s]=dr[s];var c=[];for(s in l)c.push(`${s}=${l[s]}`);lr=c}return lr};function Xn(s,l){if(d)return we(19,1,s,l);s>>>=0,l>>>=0;var c,h=0,y=0;for(c of Yn()){var x=l+h;_e()[s+y>>>2>>>0]=x,h+=xt(c,x,1/0)+1,y+=4}return 0}function Qn(s,l){if(d)return we(20,1,s,l);s>>>=0,l>>>=0;var c=Yn();for(var h of(_e()[s>>>2>>>0]=c.length,s=0,c))s+=rr(h)+1;return _e()[l>>>2>>>0]=s,0}function Jn(s){return d?we(21,1,s):52}function es(s,l,c,h){return d?we(22,1,s,l,c,h):52}function ts(s,l,c,h){return d?we(23,1,s,l,c,h):70}var Qh=[null,[],[]];function is(s,l,c,h){if(d)return we(24,1,s,l,c,h);l>>>=0,c>>>=0,h>>>=0;for(var y=0,x=0;x<c;x++){var I=_e()[l>>>2>>>0],A=_e()[l+4>>>2>>>0];l+=8;for(var P=0;P<A;P++){var W=s,F=ee()[I+P>>>0],ie=Qh[W];F===0||F===10?((W===1?te:ge)(bn(ie)),ie.length=0):ie.push(F)}y+=A}return _e()[h>>>2>>>0]=y,0}d||function(){for(var s=r.numThreads-1;s--;)mn();Zi.push(()=>{wt++,function(l){d?l():Promise.all(ct.map(hn)).then(l)}(()=>sn())})}();for(var rs=Array(256),$i=0;256>$i;++$i)rs[$i]=String.fromCharCode($i);Rn=rs,at.push(0,1,void 0,1,null,1,!0,1,!1,1),r.count_emval_handles=()=>at.length/2-5-er.length,d||(T=new WebAssembly.Memory({initial:256,maximum:65536,shared:!0}),he()),r.wasmBinary&&($=r.wasmBinary),r.stackSave=()=>gr(),r.stackRestore=s=>xi(s),r.stackAlloc=s=>mr(s),r.setValue=function(s,l,c="i8"){switch(c.endsWith("*")&&(c="*"),c){case"i1":case"i8":G()[s>>>0]=l;break;case"i16":Te()[s>>>1>>>0]=l;break;case"i32":U()[s>>>2>>>0]=l;break;case"i64":j[s>>>3]=BigInt(l);break;case"float":Ne()[s>>>2>>>0]=l;break;case"double":Ae()[s>>>3>>>0]=l;break;case"*":_e()[s>>>2>>>0]=l;break;default:dt(`invalid type for setValue: ${c}`)}},r.getValue=function(s,l="i8"){switch(l.endsWith("*")&&(l="*"),l){case"i1":case"i8":return G()[s>>>0];case"i16":return Te()[s>>>1>>>0];case"i32":return U()[s>>>2>>>0];case"i64":return j[s>>>3];case"float":return Ne()[s>>>2>>>0];case"double":return Ae()[s>>>3>>>0];case"*":return _e()[s>>>2>>>0];default:dt(`invalid type for getValue: ${l}`)}},r.UTF8ToString=Ce,r.stringToUTF8=xt,r.lengthBytesUTF8=rr;var Jh=[Yi,dn,gn,wn,$n,vn,xn,Cn,Tn,kn,Sn,In,En,zn,An,On,Gn,Hn,Fn,Xn,Qn,Jn,es,ts,is],pr={893836:(s,l,c,h,y)=>{if(r===void 0||!r.Fb)return 1;if((s=Ce(Number(s>>>0))).startsWith("./")&&(s=s.substring(2)),!(s=r.Fb.get(s)))return 2;if(l=Number(l>>>0),c=Number(c>>>0),h=Number(h>>>0),l+c>s.byteLength)return 3;try{let x=s.subarray(l,l+c);switch(y){case 0:ee().set(x,h>>>0);break;case 1:r.mc?r.mc(h,x):r.cc(h,x);break;default:return 4}return 0}catch{return 4}},894660:(s,l,c)=>{r.Pb(s,ee().subarray(l>>>0,l+c>>>0))},894724:()=>r.oc(),894766:s=>{r.Ob(s)},894803:()=>{r.Wb()},894834:()=>{r.Xb()},894863:()=>{r.ac()},894888:s=>r.Vb(s),894921:s=>r.Zb(s),894953:(s,l,c)=>{r.Lb(Number(s),Number(l),Number(c),!0)},895016:(s,l,c)=>{r.Lb(Number(s),Number(l),Number(c))},895073:()=>typeof wasmOffsetConverter<"u",895130:s=>{r.Ab("Abs",s,void 0)},895181:s=>{r.Ab("Neg",s,void 0)},895232:s=>{r.Ab("Floor",s,void 0)},895285:s=>{r.Ab("Ceil",s,void 0)},895337:s=>{r.Ab("Reciprocal",s,void 0)},895395:s=>{r.Ab("Sqrt",s,void 0)},895447:s=>{r.Ab("Exp",s,void 0)},895498:s=>{r.Ab("Erf",s,void 0)},895549:s=>{r.Ab("Sigmoid",s,void 0)},895604:(s,l,c)=>{r.Ab("HardSigmoid",s,{alpha:l,beta:c})},895683:s=>{r.Ab("Log",s,void 0)},895734:s=>{r.Ab("Sin",s,void 0)},895785:s=>{r.Ab("Cos",s,void 0)},895836:s=>{r.Ab("Tan",s,void 0)},895887:s=>{r.Ab("Asin",s,void 0)},895939:s=>{r.Ab("Acos",s,void 0)},895991:s=>{r.Ab("Atan",s,void 0)},896043:s=>{r.Ab("Sinh",s,void 0)},896095:s=>{r.Ab("Cosh",s,void 0)},896147:s=>{r.Ab("Asinh",s,void 0)},896200:s=>{r.Ab("Acosh",s,void 0)},896253:s=>{r.Ab("Atanh",s,void 0)},896306:s=>{r.Ab("Tanh",s,void 0)},896358:s=>{r.Ab("Not",s,void 0)},896409:(s,l,c)=>{r.Ab("Clip",s,{min:l,max:c})},896478:s=>{r.Ab("Clip",s,void 0)},896530:(s,l)=>{r.Ab("Elu",s,{alpha:l})},896588:s=>{r.Ab("Gelu",s,void 0)},896640:s=>{r.Ab("Relu",s,void 0)},896692:(s,l)=>{r.Ab("LeakyRelu",s,{alpha:l})},896756:(s,l)=>{r.Ab("ThresholdedRelu",s,{alpha:l})},896826:(s,l)=>{r.Ab("Cast",s,{to:l})},896884:s=>{r.Ab("Add",s,void 0)},896935:s=>{r.Ab("Sub",s,void 0)},896986:s=>{r.Ab("Mul",s,void 0)},897037:s=>{r.Ab("Div",s,void 0)},897088:s=>{r.Ab("Pow",s,void 0)},897139:s=>{r.Ab("Equal",s,void 0)},897192:s=>{r.Ab("Greater",s,void 0)},897247:s=>{r.Ab("GreaterOrEqual",s,void 0)},897309:s=>{r.Ab("Less",s,void 0)},897361:s=>{r.Ab("LessOrEqual",s,void 0)},897420:(s,l,c,h,y)=>{r.Ab("ReduceMean",s,{keepDims:!!l,noopWithEmptyAxes:!!c,axes:h?Array.from(U().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},897595:(s,l,c,h,y)=>{r.Ab("ReduceMax",s,{keepDims:!!l,noopWithEmptyAxes:!!c,axes:h?Array.from(U().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},897769:(s,l,c,h,y)=>{r.Ab("ReduceMin",s,{keepDims:!!l,noopWithEmptyAxes:!!c,axes:h?Array.from(U().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},897943:(s,l,c,h,y)=>{r.Ab("ReduceProd",s,{keepDims:!!l,noopWithEmptyAxes:!!c,axes:h?Array.from(U().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},898118:(s,l,c,h,y)=>{r.Ab("ReduceSum",s,{keepDims:!!l,noopWithEmptyAxes:!!c,axes:h?Array.from(U().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},898292:(s,l,c,h,y)=>{r.Ab("ReduceL1",s,{keepDims:!!l,noopWithEmptyAxes:!!c,axes:h?Array.from(U().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},898465:(s,l,c,h,y)=>{r.Ab("ReduceL2",s,{keepDims:!!l,noopWithEmptyAxes:!!c,axes:h?Array.from(U().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},898638:(s,l,c,h,y)=>{r.Ab("ReduceLogSum",s,{keepDims:!!l,noopWithEmptyAxes:!!c,axes:h?Array.from(U().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},898815:(s,l,c,h,y)=>{r.Ab("ReduceSumSquare",s,{keepDims:!!l,noopWithEmptyAxes:!!c,axes:h?Array.from(U().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},898995:(s,l,c,h,y)=>{r.Ab("ReduceLogSumExp",s,{keepDims:!!l,noopWithEmptyAxes:!!c,axes:h?Array.from(U().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},899175:s=>{r.Ab("Where",s,void 0)},899228:(s,l,c)=>{r.Ab("Transpose",s,{perm:l?Array.from(U().subarray(Number(l)>>>0,Number(c)>>>0)):[]})},899352:(s,l,c,h)=>{r.Ab("DepthToSpace",s,{blocksize:l,mode:Ce(c),format:h?"NHWC":"NCHW"})},899485:(s,l,c,h)=>{r.Ab("DepthToSpace",s,{blocksize:l,mode:Ce(c),format:h?"NHWC":"NCHW"})},899618:(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke)=>{r.Ab("ConvTranspose",s,{format:P?"NHWC":"NCHW",autoPad:l,dilations:[c],group:h,kernelShape:[y],pads:[x,I],strides:[A],wIsConst:()=>!!G()[W>>>0],outputPadding:F?Array.from(U().subarray(Number(F)>>>0,Number(ie)>>>0)):[],outputShape:ue?Array.from(U().subarray(Number(ue)>>>0,Number(ce)>>>0)):[],activation:Ce(ke)})},900051:(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce)=>{r.Ab("ConvTranspose",s,{format:A?"NHWC":"NCHW",autoPad:l,dilations:Array.from(U().subarray(Number(c)>>>0,2+(Number(c)>>>0)>>>0)),group:h,kernelShape:Array.from(U().subarray(Number(y)>>>0,2+(Number(y)>>>0)>>>0)),pads:Array.from(U().subarray(Number(x)>>>0,4+(Number(x)>>>0)>>>0)),strides:Array.from(U().subarray(Number(I)>>>0,2+(Number(I)>>>0)>>>0)),wIsConst:()=>!!G()[P>>>0],outputPadding:W?Array.from(U().subarray(Number(W)>>>0,Number(F)>>>0)):[],outputShape:ie?Array.from(U().subarray(Number(ie)>>>0,Number(ue)>>>0)):[],activation:Ce(ce)})},900712:(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke)=>{r.Ab("ConvTranspose",s,{format:P?"NHWC":"NCHW",autoPad:l,dilations:[c],group:h,kernelShape:[y],pads:[x,I],strides:[A],wIsConst:()=>!!G()[W>>>0],outputPadding:F?Array.from(U().subarray(Number(F)>>>0,Number(ie)>>>0)):[],outputShape:ue?Array.from(U().subarray(Number(ue)>>>0,Number(ce)>>>0)):[],activation:Ce(ke)})},901145:(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce)=>{r.Ab("ConvTranspose",s,{format:A?"NHWC":"NCHW",autoPad:l,dilations:Array.from(U().subarray(Number(c)>>>0,2+(Number(c)>>>0)>>>0)),group:h,kernelShape:Array.from(U().subarray(Number(y)>>>0,2+(Number(y)>>>0)>>>0)),pads:Array.from(U().subarray(Number(x)>>>0,4+(Number(x)>>>0)>>>0)),strides:Array.from(U().subarray(Number(I)>>>0,2+(Number(I)>>>0)>>>0)),wIsConst:()=>!!G()[P>>>0],outputPadding:W?Array.from(U().subarray(Number(W)>>>0,Number(F)>>>0)):[],outputShape:ie?Array.from(U().subarray(Number(ie)>>>0,Number(ue)>>>0)):[],activation:Ce(ce)})},901806:(s,l)=>{r.Ab("GlobalAveragePool",s,{format:l?"NHWC":"NCHW"})},901897:(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce)=>{r.Ab("AveragePool",s,{format:ce?"NHWC":"NCHW",auto_pad:l,ceil_mode:c,count_include_pad:h,storage_order:y,dilations:x?Array.from(U().subarray(Number(x)>>>0,Number(I)>>>0)):[],kernel_shape:A?Array.from(U().subarray(Number(A)>>>0,Number(P)>>>0)):[],pads:W?Array.from(U().subarray(Number(W)>>>0,Number(F)>>>0)):[],strides:ie?Array.from(U().subarray(Number(ie)>>>0,Number(ue)>>>0)):[]})},902376:(s,l)=>{r.Ab("GlobalAveragePool",s,{format:l?"NHWC":"NCHW"})},902467:(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce)=>{r.Ab("AveragePool",s,{format:ce?"NHWC":"NCHW",auto_pad:l,ceil_mode:c,count_include_pad:h,storage_order:y,dilations:x?Array.from(U().subarray(Number(x)>>>0,Number(I)>>>0)):[],kernel_shape:A?Array.from(U().subarray(Number(A)>>>0,Number(P)>>>0)):[],pads:W?Array.from(U().subarray(Number(W)>>>0,Number(F)>>>0)):[],strides:ie?Array.from(U().subarray(Number(ie)>>>0,Number(ue)>>>0)):[]})},902946:(s,l)=>{r.Ab("GlobalMaxPool",s,{format:l?"NHWC":"NCHW"})},903033:(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce)=>{r.Ab("MaxPool",s,{format:ce?"NHWC":"NCHW",auto_pad:l,ceil_mode:c,count_include_pad:h,storage_order:y,dilations:x?Array.from(U().subarray(Number(x)>>>0,Number(I)>>>0)):[],kernel_shape:A?Array.from(U().subarray(Number(A)>>>0,Number(P)>>>0)):[],pads:W?Array.from(U().subarray(Number(W)>>>0,Number(F)>>>0)):[],strides:ie?Array.from(U().subarray(Number(ie)>>>0,Number(ue)>>>0)):[]})},903508:(s,l)=>{r.Ab("GlobalMaxPool",s,{format:l?"NHWC":"NCHW"})},903595:(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce)=>{r.Ab("MaxPool",s,{format:ce?"NHWC":"NCHW",auto_pad:l,ceil_mode:c,count_include_pad:h,storage_order:y,dilations:x?Array.from(U().subarray(Number(x)>>>0,Number(I)>>>0)):[],kernel_shape:A?Array.from(U().subarray(Number(A)>>>0,Number(P)>>>0)):[],pads:W?Array.from(U().subarray(Number(W)>>>0,Number(F)>>>0)):[],strides:ie?Array.from(U().subarray(Number(ie)>>>0,Number(ue)>>>0)):[]})},904070:(s,l,c,h,y)=>{r.Ab("Gemm",s,{alpha:l,beta:c,transA:h,transB:y})},904174:s=>{r.Ab("MatMul",s,void 0)},904228:(s,l,c,h)=>{r.Ab("ArgMax",s,{keepDims:!!l,selectLastIndex:!!c,axis:h})},904336:(s,l,c,h)=>{r.Ab("ArgMin",s,{keepDims:!!l,selectLastIndex:!!c,axis:h})},904444:(s,l)=>{r.Ab("Softmax",s,{axis:l})},904507:(s,l)=>{r.Ab("Concat",s,{axis:l})},904567:(s,l,c,h,y)=>{r.Ab("Split",s,{axis:l,numOutputs:c,splitSizes:h?Array.from(U().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},904723:s=>{r.Ab("Expand",s,void 0)},904777:(s,l)=>{r.Ab("Gather",s,{axis:Number(l)})},904848:(s,l)=>{r.Ab("GatherElements",s,{axis:Number(l)})},904927:(s,l)=>{r.Ab("GatherND",s,{batch_dims:Number(l)})},905006:(s,l,c,h,y,x,I,A,P,W,F)=>{r.Ab("Resize",s,{antialias:l,axes:c?Array.from(U().subarray(Number(c)>>>0,Number(h)>>>0)):[],coordinateTransformMode:Ce(y),cubicCoeffA:x,excludeOutside:I,extrapolationValue:A,keepAspectRatioPolicy:Ce(P),mode:Ce(W),nearestMode:Ce(F)})},905368:(s,l,c,h,y,x,I)=>{r.Ab("Slice",s,{starts:l?Array.from(U().subarray(Number(l)>>>0,Number(c)>>>0)):[],ends:h?Array.from(U().subarray(Number(h)>>>0,Number(y)>>>0)):[],axes:x?Array.from(U().subarray(Number(x)>>>0,Number(I)>>>0)):[]})},905632:s=>{r.Ab("Tile",s,void 0)},905684:(s,l,c)=>{r.Ab("InstanceNormalization",s,{epsilon:l,format:c?"NHWC":"NCHW"})},905798:(s,l,c)=>{r.Ab("InstanceNormalization",s,{epsilon:l,format:c?"NHWC":"NCHW"})},905912:s=>{r.Ab("Range",s,void 0)},905965:(s,l)=>{r.Ab("Einsum",s,{equation:Ce(l)})},906046:(s,l,c,h,y)=>{r.Ab("Pad",s,{mode:l,value:c,pads:h?Array.from(U().subarray(Number(h)>>>0,Number(y)>>>0)):[]})},906189:(s,l,c,h,y,x)=>{r.Ab("BatchNormalization",s,{epsilon:l,momentum:c,spatial:!!y,trainingMode:!!h,format:x?"NHWC":"NCHW"})},906358:(s,l,c,h,y,x)=>{r.Ab("BatchNormalization",s,{epsilon:l,momentum:c,spatial:!!y,trainingMode:!!h,format:x?"NHWC":"NCHW"})},906527:(s,l,c)=>{r.Ab("CumSum",s,{exclusive:Number(l),reverse:Number(c)})},906624:(s,l,c)=>{r.Ab("DequantizeLinear",s,{axis:l,blockSize:c})},906714:(s,l,c,h,y)=>{r.Ab("GridSample",s,{align_corners:l,mode:Ce(c),padding_mode:Ce(h),format:y?"NHWC":"NCHW"})},906884:(s,l,c,h,y)=>{r.Ab("GridSample",s,{align_corners:l,mode:Ce(c),padding_mode:Ce(h),format:y?"NHWC":"NCHW"})},907054:(s,l)=>{r.Ab("ScatterND",s,{reduction:Ce(l)})},907139:(s,l,c,h,y,x,I,A,P)=>{r.Ab("Attention",s,{numHeads:l,isUnidirectional:c,maskFilterValue:h,scale:y,doRotary:x,qkvHiddenSizes:I?Array.from(U().subarray(Number(A)>>>0,Number(A)+I>>>0)):[],pastPresentShareBuffer:!!P})},907411:s=>{r.Ab("BiasAdd",s,void 0)},907466:s=>{r.Ab("BiasSplitGelu",s,void 0)},907527:s=>{r.Ab("FastGelu",s,void 0)},907583:(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke,Me)=>{r.Ab("Conv",s,{format:ie?"NHWC":"NCHW",auto_pad:l,dilations:c?Array.from(U().subarray(Number(c)>>>0,Number(h)>>>0)):[],group:y,kernel_shape:x?Array.from(U().subarray(Number(x)>>>0,Number(I)>>>0)):[],pads:A?Array.from(U().subarray(Number(A)>>>0,Number(P)>>>0)):[],strides:W?Array.from(U().subarray(Number(W)>>>0,Number(F)>>>0)):[],w_is_const:()=>!!G()[Number(ue)>>>0],activation:Ce(ce),activation_params:ke?Array.from(Ne().subarray(Number(ke)>>>0,Number(Me)>>>0)):[]})},908167:s=>{r.Ab("Gelu",s,void 0)},908219:(s,l,c,h,y,x,I,A,P)=>{r.Ab("GroupQueryAttention",s,{numHeads:l,kvNumHeads:c,scale:h,softcap:y,doRotary:x,rotaryInterleaved:I,smoothSoftmax:A,localWindowSize:P})},908436:(s,l,c,h)=>{r.Ab("LayerNormalization",s,{axis:l,epsilon:c,simplified:!!h})},908547:(s,l,c,h)=>{r.Ab("LayerNormalization",s,{axis:l,epsilon:c,simplified:!!h})},908658:(s,l,c,h,y,x)=>{r.Ab("MatMulNBits",s,{k:l,n:c,accuracyLevel:h,bits:y,blockSize:x})},908785:(s,l,c,h,y,x)=>{r.Ab("MultiHeadAttention",s,{numHeads:l,isUnidirectional:c,maskFilterValue:h,scale:y,doRotary:x})},908944:(s,l)=>{r.Ab("QuickGelu",s,{alpha:l})},909008:(s,l,c,h,y)=>{r.Ab("RotaryEmbedding",s,{interleaved:!!l,numHeads:c,rotaryEmbeddingDim:h,scale:y})},909147:(s,l,c)=>{r.Ab("SkipLayerNormalization",s,{epsilon:l,simplified:!!c})},909249:(s,l,c)=>{r.Ab("SkipLayerNormalization",s,{epsilon:l,simplified:!!c})},909351:(s,l,c,h)=>{r.Ab("GatherBlockQuantized",s,{gatherAxis:l,quantizeAxis:c,blockSize:h})},909472:s=>{r.$b(s)},909506:(s,l)=>r.bc(Number(s),Number(l),r.Gb.ec,r.Gb.errors)};function em(s,l,c){return qn(async()=>{await r.Yb(Number(s),Number(l),Number(c))})}function tm(){return typeof wasmOffsetConverter<"u"}var B=await async function(){function s(h,y){return B=h.exports,B=function(){var x=B,I={};for(let[A,P]of Object.entries(x))I[A]=typeof P=="function"?(...W)=>{_i.push(A);try{return P(...W)}finally{D||(_i.pop(),Qe&&ht===1&&_i.length===0&&(ht=0,pt+=1,gi(hs),typeof Fibers<"u"&&Fibers.sc()))}}:P;return I}(),B=function(){var x=B,I=P=>W=>P(W)>>>0,A=P=>()=>P()>>>0;return(x=Object.assign({},x)).Ea=I(x.Ea),x.gb=A(x.gb),x.ib=I(x.ib),x.tb=I(x.tb),x.ub=A(x.ub),x.__cxa_get_exception_ptr=I(x.__cxa_get_exception_ptr),x}(),pn.push(B.jb),k=y,sn(),B}wt++;var l=on();if(r.instantiateWasm)return new Promise(h=>{r.instantiateWasm(l,(y,x)=>{h(s(y,x))})});if(d)return new Promise(h=>{Z=y=>{var x=new WebAssembly.Instance(y,on());h(s(x,y))}});De??(De=r.locateFile?r.locateFile?r.locateFile("ort-wasm-simd-threaded.jsep.wasm",v):v+"ort-wasm-simd-threaded.jsep.wasm":new URL("/scanic/assets/ort-wasm-simd-threaded.jsep.BGTZ4Y7F.wasm",import.meta.url).href);try{var c=await async function(h){var y=De;if(!$&&typeof WebAssembly.instantiateStreaming=="function"&&!V(y))try{var x=fetch(y,{credentials:"same-origin"});return await WebAssembly.instantiateStreaming(x,h)}catch(I){ge(`wasm streaming compile failed: ${I}`),ge("falling back to ArrayBuffer instantiation")}return async function(I,A){try{var P=await async function(W){if(!$)try{var F=await _(W);return new Uint8Array(F)}catch{}if(W==De&&$)W=new Uint8Array($);else{if(!b)throw"both async and sync fetching of the wasm failed";W=b(W)}return W}(I);return await WebAssembly.instantiate(P,A)}catch(W){ge(`failed to asynchronously prepare wasm: ${W}`),dt(W)}}(y,h)}(l);return s(c.instance,c.module)}catch(h){return n(h),Promise.reject(h)}}(),as=s=>(as=B.Ea)(s),ns=()=>(ns=B.Fa)();r._OrtInit=(s,l)=>(r._OrtInit=B.Ga)(s,l),r._OrtGetLastError=(s,l)=>(r._OrtGetLastError=B.Ha)(s,l),r._OrtCreateSessionOptions=(s,l,c,h,y,x,I,A,P,W)=>(r._OrtCreateSessionOptions=B.Ia)(s,l,c,h,y,x,I,A,P,W),r._OrtAppendExecutionProvider=(s,l,c,h,y)=>(r._OrtAppendExecutionProvider=B.Ja)(s,l,c,h,y),r._OrtAddFreeDimensionOverride=(s,l,c)=>(r._OrtAddFreeDimensionOverride=B.Ka)(s,l,c),r._OrtAddSessionConfigEntry=(s,l,c)=>(r._OrtAddSessionConfigEntry=B.La)(s,l,c),r._OrtReleaseSessionOptions=s=>(r._OrtReleaseSessionOptions=B.Ma)(s),r._OrtCreateSession=(s,l,c)=>(r._OrtCreateSession=B.Na)(s,l,c),r._OrtReleaseSession=s=>(r._OrtReleaseSession=B.Oa)(s),r._OrtGetInputOutputCount=(s,l,c)=>(r._OrtGetInputOutputCount=B.Pa)(s,l,c),r._OrtGetInputOutputMetadata=(s,l,c,h)=>(r._OrtGetInputOutputMetadata=B.Qa)(s,l,c,h),r._OrtFree=s=>(r._OrtFree=B.Ra)(s),r._OrtCreateTensor=(s,l,c,h,y,x)=>(r._OrtCreateTensor=B.Sa)(s,l,c,h,y,x),r._OrtGetTensorData=(s,l,c,h,y)=>(r._OrtGetTensorData=B.Ta)(s,l,c,h,y),r._OrtReleaseTensor=s=>(r._OrtReleaseTensor=B.Ua)(s),r._OrtCreateRunOptions=(s,l,c,h)=>(r._OrtCreateRunOptions=B.Va)(s,l,c,h),r._OrtAddRunConfigEntry=(s,l,c)=>(r._OrtAddRunConfigEntry=B.Wa)(s,l,c),r._OrtReleaseRunOptions=s=>(r._OrtReleaseRunOptions=B.Xa)(s),r._OrtCreateBinding=s=>(r._OrtCreateBinding=B.Ya)(s),r._OrtBindInput=(s,l,c)=>(r._OrtBindInput=B.Za)(s,l,c),r._OrtBindOutput=(s,l,c,h)=>(r._OrtBindOutput=B._a)(s,l,c,h),r._OrtClearBoundOutputs=s=>(r._OrtClearBoundOutputs=B.$a)(s),r._OrtReleaseBinding=s=>(r._OrtReleaseBinding=B.ab)(s),r._OrtRunWithBinding=(s,l,c,h,y)=>(r._OrtRunWithBinding=B.bb)(s,l,c,h,y),r._OrtRun=(s,l,c,h,y,x,I,A)=>(r._OrtRun=B.cb)(s,l,c,h,y,x,I,A),r._OrtEndProfiling=s=>(r._OrtEndProfiling=B.db)(s),r._JsepOutput=(s,l,c)=>(r._JsepOutput=B.eb)(s,l,c),r._JsepGetNodeName=s=>(r._JsepGetNodeName=B.fb)(s);var cr=()=>(cr=B.gb)(),nt=r._free=s=>(nt=r._free=B.hb)(s),vi=r._malloc=s=>(vi=r._malloc=B.ib)(s),fr=(s,l,c,h,y,x)=>(fr=B.kb)(s,l,c,h,y,x),ss=()=>(ss=B.lb)(),os=(s,l,c,h,y)=>(os=B.mb)(s,l,c,h,y),us=s=>(us=B.nb)(s),hr=s=>(hr=B.ob)(s),ls=(s,l)=>(ls=B.pb)(s,l),ds=()=>(ds=B.qb)(),ps=(s,l)=>(ps=B.rb)(s,l),xi=s=>(xi=B.sb)(s),mr=s=>(mr=B.tb)(s),gr=()=>(gr=B.ub)(),cs=r.dynCall_ii=(s,l)=>(cs=r.dynCall_ii=B.vb)(s,l);r.dynCall_vii=(s,l,c)=>(r.dynCall_vii=B.dynCall_vii)(s,l,c),r.dynCall_iiiii=(s,l,c,h,y)=>(r.dynCall_iiiii=B.dynCall_iiiii)(s,l,c,h,y),r.dynCall_iii=(s,l,c)=>(r.dynCall_iii=B.dynCall_iii)(s,l,c),r.dynCall_iiiiii=(s,l,c,h,y,x)=>(r.dynCall_iiiiii=B.dynCall_iiiiii)(s,l,c,h,y,x),r.dynCall_iiiiiiii=(s,l,c,h,y,x,I,A)=>(r.dynCall_iiiiiiii=B.dynCall_iiiiiiii)(s,l,c,h,y,x,I,A),r.dynCall_iiiiiii=(s,l,c,h,y,x,I)=>(r.dynCall_iiiiiii=B.dynCall_iiiiiii)(s,l,c,h,y,x,I),r.dynCall_vi=(s,l)=>(r.dynCall_vi=B.dynCall_vi)(s,l),r.dynCall_iiii=(s,l,c,h)=>(r.dynCall_iiii=B.dynCall_iiii)(s,l,c,h),r.dynCall_i=s=>(r.dynCall_i=B.dynCall_i)(s),r.dynCall_viiiiiiii=(s,l,c,h,y,x,I,A,P)=>(r.dynCall_viiiiiiii=B.dynCall_viiiiiiii)(s,l,c,h,y,x,I,A,P),r.dynCall_viii=(s,l,c,h)=>(r.dynCall_viii=B.dynCall_viii)(s,l,c,h),r.dynCall_viijj=(s,l,c,h,y)=>(r.dynCall_viijj=B.dynCall_viijj)(s,l,c,h,y),r.dynCall_viiiiii=(s,l,c,h,y,x,I)=>(r.dynCall_viiiiii=B.dynCall_viiiiii)(s,l,c,h,y,x,I),r.dynCall_viiii=(s,l,c,h,y)=>(r.dynCall_viiii=B.dynCall_viiii)(s,l,c,h,y),r.dynCall_viiiii=(s,l,c,h,y,x)=>(r.dynCall_viiiii=B.dynCall_viiiii)(s,l,c,h,y,x),r.dynCall_vfiii=(s,l,c,h,y)=>(r.dynCall_vfiii=B.dynCall_vfiii)(s,l,c,h,y),r.dynCall_viiiiff=(s,l,c,h,y,x,I)=>(r.dynCall_viiiiff=B.dynCall_viiiiff)(s,l,c,h,y,x,I),r.dynCall_viiiiiff=(s,l,c,h,y,x,I,A)=>(r.dynCall_viiiiiff=B.dynCall_viiiiiff)(s,l,c,h,y,x,I,A),r.dynCall_ffff=(s,l,c,h)=>(r.dynCall_ffff=B.dynCall_ffff)(s,l,c,h),r.dynCall_viiff=(s,l,c,h,y)=>(r.dynCall_viiff=B.dynCall_viiff)(s,l,c,h,y),r.dynCall_fffffff=(s,l,c,h,y,x,I)=>(r.dynCall_fffffff=B.dynCall_fffffff)(s,l,c,h,y,x,I),r.dynCall_jjjjjjj=(s,l,c,h,y,x,I)=>(r.dynCall_jjjjjjj=B.dynCall_jjjjjjj)(s,l,c,h,y,x,I),r.dynCall_jjjjjj=(s,l,c,h,y,x)=>(r.dynCall_jjjjjj=B.dynCall_jjjjjj)(s,l,c,h,y,x),r.dynCall_iijjii=(s,l,c,h,y,x)=>(r.dynCall_iijjii=B.dynCall_iijjii)(s,l,c,h,y,x),r.dynCall_viiiiiiiiiiiii=(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce)=>(r.dynCall_viiiiiiiiiiiii=B.dynCall_viiiiiiiiiiiii)(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce),r.dynCall_viiiiiiiiii=(s,l,c,h,y,x,I,A,P,W,F)=>(r.dynCall_viiiiiiiiii=B.dynCall_viiiiiiiiii)(s,l,c,h,y,x,I,A,P,W,F),r.dynCall_viiiiiiiiiii=(s,l,c,h,y,x,I,A,P,W,F,ie)=>(r.dynCall_viiiiiiiiiii=B.dynCall_viiiiiiiiiii)(s,l,c,h,y,x,I,A,P,W,F,ie),r.dynCall_viiiiiiiiiiii=(s,l,c,h,y,x,I,A,P,W,F,ie,ue)=>(r.dynCall_viiiiiiiiiiii=B.dynCall_viiiiiiiiiiii)(s,l,c,h,y,x,I,A,P,W,F,ie,ue),r.dynCall_viiiiiiiiiiiiiiiiii=(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke,Me,st,Ct,Zt)=>(r.dynCall_viiiiiiiiiiiiiiiiii=B.dynCall_viiiiiiiiiiiiiiiiii)(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke,Me,st,Ct,Zt),r.dynCall_viiiiiiiii=(s,l,c,h,y,x,I,A,P,W)=>(r.dynCall_viiiiiiiii=B.dynCall_viiiiiiiii)(s,l,c,h,y,x,I,A,P,W),r.dynCall_viiiiiiiiiiiiiiiiiii=(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke,Me,st,Ct,Zt,_r)=>(r.dynCall_viiiiiiiiiiiiiiiiiii=B.dynCall_viiiiiiiiiiiiiiiiiii)(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke,Me,st,Ct,Zt,_r),r.dynCall_viiiiiii=(s,l,c,h,y,x,I,A)=>(r.dynCall_viiiiiii=B.dynCall_viiiiiii)(s,l,c,h,y,x,I,A),r.dynCall_viiiiiiiiiiiiiii=(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke,Me)=>(r.dynCall_viiiiiiiiiiiiiii=B.dynCall_viiiiiiiiiiiiiii)(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke,Me),r.dynCall_jiji=(s,l,c,h)=>(r.dynCall_jiji=B.dynCall_jiji)(s,l,c,h),r.dynCall_v=s=>(r.dynCall_v=B.dynCall_v)(s),r.dynCall_iidiiii=(s,l,c,h,y,x,I)=>(r.dynCall_iidiiii=B.dynCall_iidiiii)(s,l,c,h,y,x,I),r.dynCall_iiiiiiiii=(s,l,c,h,y,x,I,A,P)=>(r.dynCall_iiiiiiiii=B.dynCall_iiiiiiiii)(s,l,c,h,y,x,I,A,P),r.dynCall_iiij=(s,l,c,h)=>(r.dynCall_iiij=B.dynCall_iiij)(s,l,c,h),r.dynCall_iiiiiiiiii=(s,l,c,h,y,x,I,A,P,W)=>(r.dynCall_iiiiiiiiii=B.dynCall_iiiiiiiiii)(s,l,c,h,y,x,I,A,P,W),r.dynCall_iiiiiiiiiiiii=(s,l,c,h,y,x,I,A,P,W,F,ie,ue)=>(r.dynCall_iiiiiiiiiiiii=B.dynCall_iiiiiiiiiiiii)(s,l,c,h,y,x,I,A,P,W,F,ie,ue),r.dynCall_iiiiiiiiiii=(s,l,c,h,y,x,I,A,P,W,F)=>(r.dynCall_iiiiiiiiiii=B.dynCall_iiiiiiiiiii)(s,l,c,h,y,x,I,A,P,W,F),r.dynCall_ji=(s,l)=>(r.dynCall_ji=B.dynCall_ji)(s,l),r.dynCall_iijii=(s,l,c,h,y)=>(r.dynCall_iijii=B.dynCall_iijii)(s,l,c,h,y),r.dynCall_vij=(s,l,c)=>(r.dynCall_vij=B.dynCall_vij)(s,l,c),r.dynCall_viiijii=(s,l,c,h,y,x,I)=>(r.dynCall_viiijii=B.dynCall_viiijii)(s,l,c,h,y,x,I),r.dynCall_viijiiiiiiiiiiiiii=(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke,Me,st,Ct)=>(r.dynCall_viijiiiiiiiiiiiiii=B.dynCall_viijiiiiiiiiiiiiii)(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke,Me,st,Ct),r.dynCall_viiiji=(s,l,c,h,y,x)=>(r.dynCall_viiiji=B.dynCall_viiiji)(s,l,c,h,y,x),r.dynCall_fiii=(s,l,c,h)=>(r.dynCall_fiii=B.dynCall_fiii)(s,l,c,h),r.dynCall_viijii=(s,l,c,h,y,x)=>(r.dynCall_viijii=B.dynCall_viijii)(s,l,c,h,y,x),r.dynCall_viij=(s,l,c,h)=>(r.dynCall_viij=B.dynCall_viij)(s,l,c,h),r.dynCall_jiij=(s,l,c,h)=>(r.dynCall_jiij=B.dynCall_jiij)(s,l,c,h),r.dynCall_fi=(s,l)=>(r.dynCall_fi=B.dynCall_fi)(s,l),r.dynCall_fii=(s,l,c)=>(r.dynCall_fii=B.dynCall_fii)(s,l,c),r.dynCall_jii=(s,l,c)=>(r.dynCall_jii=B.dynCall_jii)(s,l,c),r.dynCall_dii=(s,l,c)=>(r.dynCall_dii=B.dynCall_dii)(s,l,c),r.dynCall_fiiii=(s,l,c,h,y)=>(r.dynCall_fiiii=B.dynCall_fiiii)(s,l,c,h,y),r.dynCall_fif=(s,l,c)=>(r.dynCall_fif=B.dynCall_fif)(s,l,c),r.dynCall_jfi=(s,l,c)=>(r.dynCall_jfi=B.dynCall_jfi)(s,l,c),r.dynCall_viiiiiiiiiiiiii=(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke)=>(r.dynCall_viiiiiiiiiiiiii=B.dynCall_viiiiiiiiiiiiii)(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke),r.dynCall_viiiiiiiiiiiiiiiiiiii=(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke,Me,st,Ct,Zt,_r,im)=>(r.dynCall_viiiiiiiiiiiiiiiiiiii=B.dynCall_viiiiiiiiiiiiiiiiiiii)(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke,Me,st,Ct,Zt,_r,im),r.dynCall_viiiiiiiiiiiiiiii=(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke,Me,st)=>(r.dynCall_viiiiiiiiiiiiiiii=B.dynCall_viiiiiiiiiiiiiiii)(s,l,c,h,y,x,I,A,P,W,F,ie,ue,ce,ke,Me,st),r.dynCall_iif=(s,l,c)=>(r.dynCall_iif=B.dynCall_iif)(s,l,c),r.dynCall_jiiii=(s,l,c,h,y)=>(r.dynCall_jiiii=B.dynCall_jiiii)(s,l,c,h,y),r.dynCall_jiii=(s,l,c,h)=>(r.dynCall_jiii=B.dynCall_jiii)(s,l,c,h),r.dynCall_viif=(s,l,c,h)=>(r.dynCall_viif=B.dynCall_viif)(s,l,c,h),r.dynCall_viiij=(s,l,c,h,y)=>(r.dynCall_viiij=B.dynCall_viiij)(s,l,c,h,y),r.dynCall_viiiijii=(s,l,c,h,y,x,I,A)=>(r.dynCall_viiiijii=B.dynCall_viiiijii)(s,l,c,h,y,x,I,A),r.dynCall_iiiiij=(s,l,c,h,y,x)=>(r.dynCall_iiiiij=B.dynCall_iiiiij)(s,l,c,h,y,x),r.dynCall_iiiiid=(s,l,c,h,y,x)=>(r.dynCall_iiiiid=B.dynCall_iiiiid)(s,l,c,h,y,x),r.dynCall_iiiiijj=(s,l,c,h,y,x,I)=>(r.dynCall_iiiiijj=B.dynCall_iiiiijj)(s,l,c,h,y,x,I),r.dynCall_iiiiiijj=(s,l,c,h,y,x,I,A)=>(r.dynCall_iiiiiijj=B.dynCall_iiiiiijj)(s,l,c,h,y,x,I,A);var fs=s=>(fs=B.wb)(s),hs=()=>(hs=B.xb)(),ms=s=>(ms=B.yb)(s),gs=()=>(gs=B.zb)();return function s(){if(0<wt)$t=s;else if(d)a(r),$e();else{for(;0<Zi.length;)Zi.shift()(r);0<wt?$t=s:(r.calledRun=!0,D||($e(),a(r)))}}(),r.PTR_SIZE=4,o},$d=xr,ws=(t=(e=globalThis.self)==null?void 0:e.name)==null?void 0:t.startsWith("em-pthread"),ws&&xr()}),Cr,ma,$s,Pe,vd,Ti,vs,xs,Tr,Cs,kr,xd,Sr,Cd,Ba=q(()=>{Ra(),Cr=typeof location>"u"?void 0:location.origin,ma=import.meta.url>"file:"&&import.meta.url<"file;",$s=()=>{{if(ma){let e=URL;return new URL(new e("ort.bundle.min.mjs",import.meta.url).href,Cr).href}return import.meta.url}},Pe=$s(),vd=()=>{if(Pe&&!Pe.startsWith("blob:"))return Pe.substring(0,Pe.lastIndexOf("/")+1)},Ti=(e,t)=>{try{let i=t??Pe;return(i?new URL(e,i):new URL(e)).origin===Cr}catch{return!1}},vs=(e,t)=>{let i=t??Pe;try{return(i?new URL(e,i):new URL(e)).href}catch{return}},xs=(e,t)=>`${t??"./"}${e}`,Tr=async e=>{let t=await(await fetch(e,{credentials:"same-origin"})).blob();return URL.createObjectURL(t)},Cs=async e=>(await import(e)).default,kr=(xm(),ci(yd)).default,xd=async()=>{if(!Pe)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(Ti(Pe))return[void 0,kr()];let e=await Tr(Pe);return[e,kr(e)]},Sr=(Cm(),ci(wd)).default,Cd=async(e,t,i,a)=>{let n=Sr&&!(e||t);if(n)if(Pe)n=Ti(Pe);else if(a&&!i)n=!0;else throw new Error("cannot determine the script source URL.");if(n)return[void 0,Sr];{let r="ort-wasm-simd-threaded.jsep.mjs",o=e??vs(r,t),u=i&&o&&!Ti(o,t),p=u?await Tr(o):o??xs(r,t);return[u?p:void 0,await Cs(p)]}}}),Ir,ki,Xt,Er,Ts,ks,Ss,Na,ye,Mt=q(()=>{Ba(),ki=!1,Xt=!1,Er=!1,Ts=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},ks=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},Ss=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,19,1,17,0,65,1,253,15,65,2,253,15,65,3,253,15,253,147,2,11]))}catch{return!1}},Na=async e=>{if(ki)return Promise.resolve();if(Xt)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(Er)throw new Error("previous call to 'initializeWebAssembly()' failed.");Xt=!0;let t=e.initTimeout,i=e.numThreads;if(e.simd!==!1){if(e.simd==="relaxed"){if(!Ss())throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.")}else if(!ks())throw new Error("WebAssembly SIMD is not supported in the current environment.")}let a=Ts();i>1&&!a&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+i+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),e.numThreads=i=1);let n=e.wasmPaths,r=typeof n=="string"?n:void 0,o=n==null?void 0:n.mjs,u=(o==null?void 0:o.href)??o,p=n==null?void 0:n.wasm,d=(p==null?void 0:p.href)??p,f=e.wasmBinary,[m,g]=await Cd(u,r,i>1,!!f||!!d),_=!1,b=[];if(t>0&&b.push(new Promise(w=>{setTimeout(()=>{_=!0,w()},t)})),b.push(new Promise((w,C)=>{let v={numThreads:i};if(f)v.wasmBinary=f;else if(d||r)v.locateFile=$=>d??r+$;else if(u&&u.indexOf("blob:")!==0)v.locateFile=$=>new URL($,u).href;else if(m){let $=vd();$&&(v.locateFile=T=>$+T)}g(v).then($=>{Xt=!1,ki=!0,Ir=$,w(),m&&URL.revokeObjectURL(m)},$=>{Xt=!1,Er=!0,C($)})})),await Promise.race(b),_)throw new Error(`WebAssembly backend initializing failed due to timeout: ${t}ms`)},ye=()=>{if(ki&&Ir)return Ir;throw new Error("WebAssembly is not initialized yet.")}}),Ke,qi,me,Da=q(()=>{Mt(),Ke=(e,t)=>{let i=ye(),a=i.lengthBytesUTF8(e)+1,n=i._malloc(a);return i.stringToUTF8(e,n,a),t.push(n),n},qi=(e,t,i,a)=>{if(typeof e=="object"&&e!==null){if(i.has(e))throw new Error("Circular reference in options");i.add(e)}Object.entries(e).forEach(([n,r])=>{let o=t?t+n:n;if(typeof r=="object")qi(r,o+".",i,a);else if(typeof r=="string"||typeof r=="number")a(o,r.toString());else if(typeof r=="boolean")a(o,r?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof r}`)})},me=e=>{let t=ye(),i=t.stackSave();try{let a=t.PTR_SIZE,n=t.stackAlloc(2*a);t._OrtGetLastError(n,n+a);let r=Number(t.getValue(n,a===4?"i32":"i64")),o=t.getValue(n+a,"*"),u=o?t.UTF8ToString(o):"";throw new Error(`${e} ERROR_CODE: ${r}, ERROR_MESSAGE: ${u}`)}finally{t.stackRestore(i)}}}),Td,Tm=q(()=>{Mt(),Da(),Td=e=>{let t=ye(),i=0,a=[],n=e||{};try{if((e==null?void 0:e.logSeverityLevel)===void 0)n.logSeverityLevel=2;else if(typeof e.logSeverityLevel!="number"||!Number.isInteger(e.logSeverityLevel)||e.logSeverityLevel<0||e.logSeverityLevel>4)throw new Error(`log severity level is not valid: ${e.logSeverityLevel}`);if((e==null?void 0:e.logVerbosityLevel)===void 0)n.logVerbosityLevel=0;else if(typeof e.logVerbosityLevel!="number"||!Number.isInteger(e.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${e.logVerbosityLevel}`);(e==null?void 0:e.terminate)===void 0&&(n.terminate=!1);let r=0;return(e==null?void 0:e.tag)!==void 0&&(r=Ke(e.tag,a)),i=t._OrtCreateRunOptions(n.logSeverityLevel,n.logVerbosityLevel,!!n.terminate,r),i===0&&me("Can't create run options."),(e==null?void 0:e.extra)!==void 0&&qi(e.extra,"",new WeakSet,(o,u)=>{let p=Ke(o,a),d=Ke(u,a);t._OrtAddRunConfigEntry(i,p,d)!==0&&me(`Can't set a run config entry: ${o} - ${u}.`)}),[i,a]}catch(r){throw i!==0&&t._OrtReleaseRunOptions(i),a.forEach(o=>t._free(o)),r}}}),Is,Es,zs,Qt,As,kd,km=q(()=>{Mt(),Da(),Is=e=>{switch(e){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"layout":return 3;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${e}`)}},Es=e=>{switch(e){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${e}`)}},zs=e=>{e.extra||(e.extra={}),e.extra.session||(e.extra.session={});let t=e.extra.session;t.use_ort_model_bytes_directly||(t.use_ort_model_bytes_directly="1"),e.executionProviders&&e.executionProviders.some(i=>(typeof i=="string"?i:i.name)==="webgpu")&&(e.enableMemPattern=!1)},Qt=(e,t,i,a)=>{let n=Ke(t,a),r=Ke(i,a);ye()._OrtAddSessionConfigEntry(e,n,r)!==0&&me(`Can't set a session config entry: ${t} - ${i}.`)},As=async(e,t,i)=>{for(let a of t){let n=typeof a=="string"?a:a.name,r=[];switch(n){case"webnn":if(n="WEBNN",typeof a!="string"){let f=a==null?void 0:a.deviceType;f&&Qt(e,"deviceType",f,i)}break;case"webgpu":if(n="JS",typeof a!="string"){let f=a;if(f!=null&&f.preferredLayout){if(f.preferredLayout!=="NCHW"&&f.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${f.preferredLayout}`);Qt(e,"preferredLayout",f.preferredLayout,i)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${n}`)}let o=Ke(n,i),u=r.length,p=0,d=0;if(u>0){p=ye()._malloc(u*ye().PTR_SIZE),i.push(p),d=ye()._malloc(u*ye().PTR_SIZE),i.push(d);for(let f=0;f<u;f++)ye().setValue(p+f*ye().PTR_SIZE,r[f][0],"*"),ye().setValue(d+f*ye().PTR_SIZE,r[f][1],"*")}await ye()._OrtAppendExecutionProvider(e,o,p,d,u)!==0&&me(`Can't append execution provider: ${n}.`)}},kd=async e=>{let t=ye(),i=0,a=[],n=e||{};zs(n);try{let r=Is(n.graphOptimizationLevel??"all"),o=Es(n.executionMode??"sequential"),u=typeof n.logId=="string"?Ke(n.logId,a):0,p=n.logSeverityLevel??2;if(!Number.isInteger(p)||p<0||p>4)throw new Error(`log severity level is not valid: ${p}`);let d=n.logVerbosityLevel??0;if(!Number.isInteger(d)||d<0||d>4)throw new Error(`log verbosity level is not valid: ${d}`);let f=typeof n.optimizedModelFilePath=="string"?Ke(n.optimizedModelFilePath,a):0;if(i=t._OrtCreateSessionOptions(r,!!n.enableCpuMemArena,!!n.enableMemPattern,o,!!n.enableProfiling,0,u,p,d,f),i===0&&me("Can't create session options."),n.executionProviders&&await As(i,n.executionProviders,a),n.enableGraphCapture!==void 0){if(typeof n.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${n.enableGraphCapture}`);Qt(i,"enableGraphCapture",n.enableGraphCapture.toString(),a)}if(n.freeDimensionOverrides)for(let[m,g]of Object.entries(n.freeDimensionOverrides)){if(typeof m!="string")throw new Error(`free dimension override name must be a string: ${m}`);if(typeof g!="number"||!Number.isInteger(g)||g<0)throw new Error(`free dimension override value must be a non-negative integer: ${g}`);let _=Ke(m,a);t._OrtAddFreeDimensionOverride(i,_,g)!==0&&me(`Can't set a free dimension override: ${m} - ${g}.`)}return n.extra!==void 0&&qi(n.extra,"",new WeakSet,(m,g)=>{Qt(i,m,g,a)}),[i,a]}catch(r){throw i!==0&&t._OrtReleaseSessionOptions(i)!==0&&me("Can't release session options."),a.forEach(o=>t._free(o)),r}}}),zt,ut,At,Fi,Wi,Ma,Pa,ga,re=q(()=>{zt=e=>{switch(e){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${e}`)}},ut=e=>{switch(e){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${e}`)}},At=(e,t)=>{let i=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][e],a=typeof t=="number"?t:t.reduce((n,r)=>n*r,1);return i>0?Math.ceil(a*i):void 0},Fi=e=>{switch(e){case"float16":return typeof Float16Array<"u"&&Float16Array.from?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${e}`)}},Wi=e=>{switch(e){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${e}`)}},Ma=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",Pa=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint64"||e==="int8"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",ga=e=>{switch(e){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;case"ml-tensor":return 5;default:throw new Error(`unsupported data location: ${e}`)}}}),Ua,Sd=q(()=>{Ra(),Ua=async e=>{if(typeof e=="string"){let t=await fetch(e);if(!t.ok)throw new Error(`failed to load external data file: ${e}`);let i=t.headers.get("Content-Length"),a=i?parseInt(i,10):0;if(a<1073741824)return new Uint8Array(await t.arrayBuffer());{if(!t.body)throw new Error(`failed to load external data file: ${e}, no response body.`);let n=t.body.getReader(),r;try{r=new ArrayBuffer(a)}catch(u){if(u instanceof RangeError){let p=Math.ceil(a/65536);r=new WebAssembly.Memory({initial:p,maximum:p}).buffer}else throw u}let o=0;for(;;){let{done:u,value:p}=await n.read();if(u)break;let d=p.byteLength;new Uint8Array(r,o,d).set(p),o+=d}return new Uint8Array(r,0,a)}}else return e instanceof Blob?new Uint8Array(await e.arrayBuffer()):e instanceof Uint8Array?e:new Uint8Array(e)}}),Os,Rs,Bs,Ns,qa,Ds,de,lt=q(()=>{re(),Os=["V","I","W","E","F"],Rs=(e,t)=>{console.log(`[${Os[e]},${new Date().toISOString()}]${t}`)},qa=(e,t)=>{Bs=e,Ns=t},Ds=(e,t)=>{let i=Wi(e),a=Wi(Bs);i>=a&&Rs(i,typeof t=="function"?t():t)},de=(...e)=>{Ns&&Ds(...e)}}),Ms,Vt,O,Li,Id,Ed,zd,ne=q(()=>{Ms=class{static calcMatMulShape(e,t){return e[1]!==t[0]?void 0:[e[0],t[1]]}},Vt=class{static calcShape(e,t,i=!1){let a=e.length,n=t.length;if(a===0)return t;if(n===0)return e;let r=Math.max(e.length,t.length),o=new Array(r);if(i){if(a<2||n<2)return;let u=Ms.calcMatMulShape([e[a-2],e[a-1]],[t[n-2],t[n-1]]);if(u===void 0)return;[o[r-2],o[r-1]]=u}for(let u=i?3:1;u<=r;u++){let p=a-u<0?1:e[a-u],d=n-u<0?1:t[n-u];if(p!==d&&p>1&&d>1)return;let f=Math.max(p,d);if(p&&d)o[r-u]=Math.max(p,d);else{if(f>1)return;o[r-u]=0}}return o}static isValidBroadcast(e,t){let i=e.length,a=t.length;if(i>a)return!1;for(let n=1;n<=i;n++)if(e[i-n]!==1&&e[i-n]!==t[a-n])return!1;return!0}},O=class Mi{static size(t){return Mi.getSizeFromDimensionRange(t,0,t.length)}static convertShape(t,i=4){let a=t.length;if(a===0)return[];let n=new Array(a),r=a-1;for(;r>=0;){if(t[r]%i===0){n[r]=t[r]/i;break}if(i%t[r]!==0)throw new Error("cannot convert shape");n[r]=1,i/=t[r],r--}for(r--;r>=0;r--)n[r]=t[r];return n}static sizeFromDimension(t,i){if(i<0||i>t.length)throw new Error(`invalid dimension of ${i} for sizeFromDimension as Tensor has ${t.length} dimensions.`);return Mi.getSizeFromDimensionRange(t,i,t.length)}static sizeToDimension(t,i){if(i<0||i>t.length)throw new Error(`invalid dimension of ${i} for sizeToDimension as Tensor has ${t.length} dimensions.`);return Mi.getSizeFromDimensionRange(t,0,i)}static getSizeFromDimensionRange(t,i,a){let n=1;for(let r=i;r<a;r++){if(t[r]<0)throw new Error("cannot get valid size from specified dimension range. Most likely the range contains negative values in them.");n*=Number(t[r])}return n}static computeStrides(t){let i=t.length;if(i===0)return[];if(i===1)return[1];let a=new Array(i);a[i-1]=1,a[i-2]=t[i-1];for(let n=i-3;n>=0;--n)a[n]=a[n+1]*t[n+1];return a}static normalizeAxis(t,i){if(t<-i&&t>=i)throw new Error("unsupported axis for this operation.");return t<0?t+i:t}static normalizeAxes(t,i){return t.map(a=>this.normalizeAxis(a,i??t.length))}static sortBasedOnPerm(t,i){return i?i.map(a=>t[a]):t.slice().reverse()}static padShape(t,i){let a=t.length;return t.map((n,r)=>n+i[r]+i[r+a])}static areEqual(t,i){return t.length!==i.length?!1:t.every((a,n)=>a===i[n])}},Li=class ui{static adjustPoolAttributes(t,i,a,n,r,o){if(!t&&a.length!==i.length-2)throw new Error("length of specified kernel shapes should be 2 less than length of input dimensions");if(t)for(let u=0;u<i.length-2;u++)u>=a.length?a.push(i[u+2]):a[u]=i[u+2];for(let u=0;u<a.length;u++)if(u<n.length){if(n[u]<0)throw new Error("strides should be greater than or equal to 1")}else n.push(1);for(let u=0;u<a.length;u++)if(u<r.length){if(r[u]<0)throw new Error("dilations should be greater than or equal to 1")}else r.push(1);for(let u=0;u<a.length*2;u++)if(u<o.length){if(o[u]<0)throw new Error("pad should be greater than or equal to 1")}else o.push(0);for(let u=0;u<a.length;u++){if(a[u]<=0)throw new Error("kernel shapes need to be greater than 0");if(o[u]>=a[u]||o[u+a.length]>=a[u])throw new Error("pads should be smaller than kernel")}}static adjustPadsBasedOnAutoPad(t,i,a,n,r,o,u){if(u){if(r.length!==2*(t.length-2))throw new Error("length of pads should be twice the length of data dimensions");if(i.length!==t.length-2)throw new Error("length of strides should be the length of data dimensions");if(n.length!==t.length-2)throw new Error("length of kernel shapes should be the length of data dimensions");for(let p=0;p<t.length-2;p++)ui.adjustPadAndReturnShape(t[p+(o?1:2)],i[p],a[p],n[p],r,p,p+t.length-2,u)}}static computePoolOutputShape(t,i,a,n,r,o,u){if(i.length<=0)throw new Error("input shape must be of size greater than 0");let p=[i[0],i[1]];return ui.computeShapeHelper(t,i,p,a,n,r,o,u),p}static computeConvOutputShape(t,i,a,n,r,o,u){if(t.length<=0||i.length<=0)throw new Error("invalid input tensor dims or invalid filter tensor dims");let p=[t[0],i[0]];return ui.computeShapeHelper(!1,t,p,a,n,r,o,u),p}static computeShapeHelper(t,i,a,n,r,o,u,p){if(t)for(let d=0;d<i.length-2;d++)a.push(1);else for(let d=0;d<i.length-2;d++)a.push(ui.adjustPadAndReturnShape(i[d+2],n[d],r[d],o[d],u,d,d+i.length-2,p))}static adjustPadAndReturnShape(t,i,a,n,r,o,u,p){let d=a*(n-1)+1;if(p&&p!=="NOTSET")switch(p){case"VALID":return r[o]=0,r[u]=0,Math.floor((t-d)/i+1);case"SAME_LOWER":case"SAME_UPPER":if(a!==1)throw new Error("Dilation not supported for SAME_UPPER or SAME_LOWER");{let f=((t+i-1)/i-1)*i+n-t;return r[o]=Math.floor(p==="SAME_LOWER"?(f+1)/2:f/2),r[u]=f-r[o],Math.floor((t+f-n)/i+1)}default:throw new Error("Unsupported AutoPad type")}else return Math.floor((t+r[o]+r[u]-d)/i+1)}},Id=class{static getShapeOfGemmResult(e,t,i,a,n){if(e.length!==2||i.length!==2)throw new Error("shape need to be of size 2");let r,o,u;t?(r=e[1],o=e[0]):(r=e[0],o=e[1]);let p=-1;if(a?(u=i[0],p=1):(u=i[1],p=0),i[p]!==o)throw new Error("dimension mismatch");if(r<=0||u<=0||o<=0)throw new Error("invalid shape specified");if(n&&!Vt.isValidBroadcast(n,[r,u]))throw new Error("gemm: invalid bias shape for broadcast");return[r,u,o]}},Ed=-34028234663852886e22,zd=34028234663852886e22}),Wa,Ad=q(()=>{re(),Wa=(e,t)=>new(Fi(t))(e)}),zr,_a,Ar,Ps,Or,Us,Rr,Br,Nr,qs,Od,Sm=q(()=>{re(),lt(),zr=new Map([["float32",32],["float16",16],["int32",32],["uint32",32],["int64",64],["uint64",64],["int8",8],["uint8",8],["int4",4],["uint4",4]]),_a=(e,t)=>{if(t==="int32")return e;let i=zr.get(t);if(!i)throw new Error(`WebNN backend does not support data type: ${t}`);let a=i/8;if(e.byteLength%a!==0)throw new Error(`Invalid Uint8Array length - must be a multiple of ${a}.`);let n=e.byteLength/a,r=new(Fi(t))(e.buffer,e.byteOffset,n);switch(t){case"int64":case"uint64":{let o=new Int32Array(n);for(let u=0;u<n;u++){let p=r[u];if(p>2147483647n||p<-2147483648n)throw new Error("Can not convert int64 data to int32 - value out of range.");o[u]=Number(p)}return new Uint8Array(o.buffer)}case"int8":case"uint8":case"uint32":{if(t==="uint32"&&r.some(u=>u>2147483647))throw new Error("Can not convert uint32 data to int32 - value out of range.");let o=Int32Array.from(r,Number);return new Uint8Array(o.buffer)}default:throw new Error(`Unsupported data conversion from ${t} to 'int32'`)}},Ar=(e,t)=>{if(t==="int32")return e;if(e.byteLength%4!==0)throw new Error("Invalid Uint8Array length - must be a multiple of 4 (int32).");let i=e.byteLength/4,a=new Int32Array(e.buffer,e.byteOffset,i);switch(t){case"int64":{let n=BigInt64Array.from(a,BigInt);return new Uint8Array(n.buffer)}case"uint64":{if(a.some(r=>r<0))throw new Error("Can not convert int32 data to uin64 - negative value found.");let n=BigUint64Array.from(a,BigInt);return new Uint8Array(n.buffer)}case"int8":{if(a.some(r=>r<-128||r>127))throw new Error("Can not convert int32 data to int8 - value out of range.");let n=Int8Array.from(a,Number);return new Uint8Array(n.buffer)}case"uint8":{if(a.some(n=>n<0||n>255))throw new Error("Can not convert int32 data to uint8 - value out of range.");return Uint8Array.from(a,Number)}case"uint32":{if(a.some(r=>r<0))throw new Error("Can not convert int32 data to uint32 - negative value found.");let n=Uint32Array.from(a,Number);return new Uint8Array(n.buffer)}default:throw new Error(`Unsupported data conversion from 'int32' to ${t}`)}},Ps=1,Or=()=>Ps++,Us=new Map([["int8","int32"],["uint8","int32"],["uint32","int32"],["int64","int32"]]),Rr=(e,t)=>{let i=zr.get(e);if(!i)throw new Error(`WebNN backend does not support data type: ${e}`);return t.length>0?Math.ceil(t.reduce((a,n)=>a*n)*i/8):0},Br=class{constructor(e){this.isDataConverted=!1;let{sessionId:t,context:i,tensor:a,dataType:n,shape:r,fallbackDataType:o}=e;this.sessionId=t,this.mlContext=i,this.mlTensor=a,this.dataType=n,this.tensorShape=r,this.fallbackDataType=o}get tensor(){return this.mlTensor}get type(){return this.dataType}get fallbackType(){return this.fallbackDataType}get shape(){return this.tensorShape}get byteLength(){return Rr(this.dataType,this.tensorShape)}destroy(){de("verbose",()=>"[WebNN] TensorWrapper.destroy"),this.mlTensor.destroy()}write(e){this.mlContext.writeTensor(this.mlTensor,e)}async read(e){if(this.fallbackDataType){let t=await this.mlContext.readTensor(this.mlTensor),i=Ar(new Uint8Array(t),this.dataType);if(e){(e instanceof ArrayBuffer?new Uint8Array(e):new Uint8Array(e.buffer,e.byteOffset,e.byteLength)).set(i);return}else return i.buffer}else return e?this.mlContext.readTensor(this.mlTensor,e):this.mlContext.readTensor(this.mlTensor)}canReuseTensor(e,t,i){return this.mlContext===e&&this.dataType===t&&this.tensorShape.length===i.length&&this.tensorShape.every((a,n)=>a===i[n])}setIsDataConverted(e){this.isDataConverted=e}},Nr=class{constructor(e,t){this.tensorManager=e,this.wrapper=t}get tensorWrapper(){return this.wrapper}releaseTensor(){this.tensorWrapper&&(this.tensorManager.releaseTensor(this.tensorWrapper),this.wrapper=void 0)}async ensureTensor(e,t,i,a){let n=this.tensorManager.getMLContext(e),r;if(!n.opSupportLimits().input.dataTypes.includes(t)){if(r=Us.get(t),!r||!n.opSupportLimits().input.dataTypes.includes(r))throw new Error(`WebNN backend does not support data type: ${t}`);de("verbose",()=>`[WebNN] TensorIdTracker.ensureTensor: fallback dataType from ${t} to ${r}`)}if(this.wrapper){if(this.wrapper.canReuseTensor(n,t,i))return this.wrapper.tensor;if(a){if(this.wrapper.byteLength!==Rr(t,i))throw new Error("Unable to copy data to tensor with different size.");this.activeUpload=new Uint8Array(await this.wrapper.read())}this.tensorManager.releaseTensor(this.wrapper)}let o=typeof MLTensorUsage>"u"?void 0:MLTensorUsage.READ|MLTensorUsage.WRITE;return this.wrapper=await this.tensorManager.getCachedTensor(e,t,i,o,!0,!0,r),a&&this.activeUpload&&(this.wrapper.write(this.activeUpload),this.activeUpload=void 0),this.wrapper.tensor}upload(e){let t=e;if(this.wrapper){if(this.wrapper.fallbackType)if(this.wrapper.fallbackType==="int32")t=_a(e,this.wrapper.type),this.wrapper.setIsDataConverted(!0);else throw new Error(`Unsupported fallback data type: ${this.wrapper.fallbackType}`);if(e.byteLength===this.wrapper.byteLength){this.wrapper.write(t);return}else de("verbose",()=>"Data size does not match tensor size. Releasing tensor."),this.releaseTensor()}this.activeUpload?this.activeUpload.set(t):this.activeUpload=new Uint8Array(t)}async download(e){var t,i;if(this.activeUpload){let a=(t=this.wrapper)!=null&&t.isDataConverted?Ar(this.activeUpload,(i=this.wrapper)==null?void 0:i.type):this.activeUpload;if(e){e instanceof ArrayBuffer?new Uint8Array(e).set(a):new Uint8Array(e.buffer,e.byteOffset,e.byteLength).set(a);return}else return a.buffer}if(!this.wrapper)throw new Error("Tensor has not been created.");return e?this.wrapper.read(e):this.wrapper.read()}},qs=class{constructor(e){this.backend=e,this.tensorTrackersById=new Map,this.freeTensors=[],this.externalTensors=new Set}getMLContext(e){let t=this.backend.getMLContext(e);if(!t)throw new Error("MLContext not found for session.");return t}reserveTensorId(){let e=Or();return this.tensorTrackersById.set(e,new Nr(this)),e}releaseTensorId(e){let t=this.tensorTrackersById.get(e);t&&(this.tensorTrackersById.delete(e),t.tensorWrapper&&this.releaseTensor(t.tensorWrapper))}async ensureTensor(e,t,i,a,n){de("verbose",()=>`[WebNN] TensorManager.ensureTensor {tensorId: ${t}, dataType: ${i}, shape: ${a}, copyOld: ${n}}`);let r=this.tensorTrackersById.get(t);if(!r)throw new Error("Tensor not found.");return r.ensureTensor(e,i,a,n)}upload(e,t){let i=this.tensorTrackersById.get(e);if(!i)throw new Error("Tensor not found.");i.upload(t)}async download(e,t){de("verbose",()=>`[WebNN] TensorManager.download {tensorId: ${e}, dstBuffer: ${t==null?void 0:t.byteLength}}`);let i=this.tensorTrackersById.get(e);if(!i)throw new Error("Tensor not found.");return i.download(t)}releaseTensorsForSession(e){for(let t of this.freeTensors)t.sessionId===e&&t.destroy();this.freeTensors=this.freeTensors.filter(t=>t.sessionId!==e)}registerTensor(e,t,i,a){let n=this.getMLContext(e),r=Or(),o=new Br({sessionId:e,context:n,tensor:t,dataType:i,shape:a});return this.tensorTrackersById.set(r,new Nr(this,o)),this.externalTensors.add(o),r}async getCachedTensor(e,t,i,a,n,r,o){let u=this.getMLContext(e);for(let[d,f]of this.freeTensors.entries())if(f.canReuseTensor(u,t,i)){de("verbose",()=>`[WebNN] Reusing tensor {dataType: ${t}, ${o?`fallbackDataType: ${o},`:""} shape: ${i}`);let m=this.freeTensors.splice(d,1)[0];return m.sessionId=e,m}de("verbose",()=>`[WebNN] MLContext.createTensor {dataType: ${t}, ${o?`fallbackDataType: ${o},`:""} shape: ${i}}`);let p=await u.createTensor({dataType:o??t,shape:i,dimensions:i,usage:a,writable:n,readable:r});return new Br({sessionId:e,context:u,tensor:p,dataType:t,shape:i,fallbackDataType:o})}releaseTensor(e){this.externalTensors.has(e)&&this.externalTensors.delete(e),this.freeTensors.push(e)}},Od=(...e)=>new qs(...e)}),Jt,Ws,Rd,Im=q(()=>{re(),Mt(),Ad(),Sm(),lt(),Jt=new Map([[1,"float32"],[10,"float16"],[6,"int32"],[12,"uint32"],[7,"int64"],[13,"uint64"],[22,"int4"],[21,"uint4"],[3,"int8"],[2,"uint8"],[9,"uint8"]]),Ws=(e,t)=>{if(e===t)return!0;if(e===void 0||t===void 0)return!1;let i=Object.keys(e).sort(),a=Object.keys(t).sort();return i.length===a.length&&i.every((n,r)=>n===a[r]&&e[n]===t[n])},Rd=class{constructor(e){this.tensorManager=Od(this),this.mlContextBySessionId=new Map,this.sessionIdsByMLContext=new Map,this.mlContextCache=[],this.sessionGraphInputs=new Map,this.sessionGraphOutputs=new Map,this.temporaryGraphInputs=[],this.temporaryGraphOutputs=[],this.temporarySessionTensorIds=new Map,qa(e.logLevel,!!e.debug)}get currentSessionId(){if(this.activeSessionId===void 0)throw new Error("No active session");return this.activeSessionId}onRunStart(e){de("verbose",()=>`[WebNN] onRunStart {sessionId: ${e}}`),this.activeSessionId=e}onRunEnd(e){de("verbose",()=>`[WebNN] onRunEnd {sessionId: ${e}}`);let t=this.temporarySessionTensorIds.get(e);if(t){for(let i of t)de("verbose",()=>`[WebNN] releasing temporary tensor {tensorId: ${i}}`),this.tensorManager.releaseTensorId(i);this.temporarySessionTensorIds.delete(e),this.activeSessionId=void 0}}async createMLContext(e){if(e instanceof GPUDevice){let i=this.mlContextCache.findIndex(a=>a.gpuDevice===e);if(i!==-1)return this.mlContextCache[i].mlContext;{let a=await navigator.ml.createContext(e);return this.mlContextCache.push({gpuDevice:e,mlContext:a}),a}}else if(e===void 0){let i=this.mlContextCache.findIndex(a=>a.options===void 0&&a.gpuDevice===void 0);if(i!==-1)return this.mlContextCache[i].mlContext;{let a=await navigator.ml.createContext();return this.mlContextCache.push({mlContext:a}),a}}let t=this.mlContextCache.findIndex(i=>Ws(i.options,e));if(t!==-1)return this.mlContextCache[t].mlContext;{let i=await navigator.ml.createContext(e);return this.mlContextCache.push({options:e,mlContext:i}),i}}registerMLContext(e,t){this.mlContextBySessionId.set(e,t);let i=this.sessionIdsByMLContext.get(t);i||(i=new Set,this.sessionIdsByMLContext.set(t,i)),i.add(e),this.temporaryGraphInputs.length>0&&(this.sessionGraphInputs.set(e,this.temporaryGraphInputs),this.temporaryGraphInputs=[]),this.temporaryGraphOutputs.length>0&&(this.sessionGraphOutputs.set(e,this.temporaryGraphOutputs),this.temporaryGraphOutputs=[])}onReleaseSession(e){this.sessionGraphInputs.delete(e),this.sessionGraphOutputs.delete(e);let t=this.mlContextBySessionId.get(e);if(!t)return;this.tensorManager.releaseTensorsForSession(e),this.mlContextBySessionId.delete(e);let i=this.sessionIdsByMLContext.get(t);if(i.delete(e),i.size===0){this.sessionIdsByMLContext.delete(t);let a=this.mlContextCache.findIndex(n=>n.mlContext===t);a!==-1&&this.mlContextCache.splice(a,1)}}getMLContext(e){return this.mlContextBySessionId.get(e)}reserveTensorId(){return this.tensorManager.reserveTensorId()}releaseTensorId(e){de("verbose",()=>`[WebNN] releaseTensorId {tensorId: ${e}}`),this.tensorManager.releaseTensorId(e)}async ensureTensor(e,t,i,a,n){let r=Jt.get(i);if(!r)throw new Error(`Unsupported ONNX data type: ${i}`);return this.tensorManager.ensureTensor(e??this.currentSessionId,t,r,a,n)}async createTemporaryTensor(e,t,i){de("verbose",()=>`[WebNN] createTemporaryTensor {onnxDataType: ${t}, shape: ${i}}`);let a=Jt.get(t);if(!a)throw new Error(`Unsupported ONNX data type: ${t}`);let n=this.tensorManager.reserveTensorId();await this.tensorManager.ensureTensor(e,n,a,i,!1);let r=this.temporarySessionTensorIds.get(e);return r?r.push(n):this.temporarySessionTensorIds.set(e,[n]),n}uploadTensor(e,t){if(!ye().shouldTransferToMLTensor)throw new Error("Trying to upload to a MLTensor while shouldTransferToMLTensor is false");de("verbose",()=>`[WebNN] uploadTensor {tensorId: ${e}, data: ${t.byteLength}}`),this.tensorManager.upload(e,t)}async downloadTensor(e,t){return this.tensorManager.download(e,t)}createMLTensorDownloader(e,t){return async()=>{let i=await this.tensorManager.download(e);return Wa(i,t)}}registerMLTensor(e,t,i,a){let n=Jt.get(i);if(!n)throw new Error(`Unsupported ONNX data type: ${i}`);let r=this.tensorManager.registerTensor(e,t,n,a);return de("verbose",()=>`[WebNN] registerMLTensor {tensor: ${t}, dataType: ${n}, dimensions: ${a}} -> {tensorId: ${r}}`),r}registerMLConstant(e,t,i,a,n,r,o=!1){if(!r)throw new Error("External mounted files are not available.");let u=e;e.startsWith("./")&&(u=e.substring(2));let p=r.get(u);if(!p)throw new Error(`File with name ${u} not found in preloaded files.`);if(t+i>p.byteLength)throw new Error("Out of bounds: data offset and length exceed the external file data size.");let d=p.slice(t,t+i).buffer,f;switch(n.dataType){case"float32":f=new Float32Array(d);break;case"float16":f=typeof Float16Array<"u"&&Float16Array.from?new Float16Array(d):new Uint16Array(d);break;case"int32":f=new Int32Array(d);break;case"uint32":f=new Uint32Array(d);break;case"int64":if(o){let m=_a(new Uint8Array(d),"int64");f=new Int32Array(m.buffer),n.dataType="int32"}else f=new BigInt64Array(d);break;case"uint64":f=new BigUint64Array(d);break;case"int8":f=new Int8Array(d);break;case"int4":case"uint4":case"uint8":f=new Uint8Array(d);break;default:throw new Error(`Unsupported data type: ${n.dataType} in creating WebNN Constant from external data.`)}return de("verbose",()=>`[WebNN] registerMLConstant {dataType: ${n.dataType}, shape: ${n.shape}}} ${o?"(Note: it was int64 data type and registered to int32 as workaround)":""}`),a.constant(n,f)}registerGraphInput(e){this.temporaryGraphInputs.push(e)}registerGraphOutput(e){this.temporaryGraphOutputs.push(e)}isGraphInput(e,t){let i=this.sessionGraphInputs.get(e);return i?i.includes(t):!1}isGraphOutput(e,t){let i=this.sessionGraphOutputs.get(e);return i?i.includes(t):!1}isGraphInputOutputTypeSupported(e,t,i=!0){let a=this.mlContextBySessionId.get(e),n=Jt.get(zt(t));return typeof n>"u"?!1:i?!!(a!=null&&a.opSupportLimits().input.dataTypes.includes(n)):!!(a!=null&&a.opSupportLimits().output.dataTypes.includes(n))}flush(){}}}),La=q(()=>{}),Dr,Si,Ii,Ls,Vs,Mr,ya,js,Bd,Em=q(()=>{lt(),La(),Dr=new Map([[64,250],[128,200],[256,200],[512,200],[2048,230],[4096,200],[8192,50],[16384,50],[32768,50],[65536,50],[131072,50],[262144,50],[524288,50],[1048576,50],[2097152,30],[4194304,20],[8388608,10],[12582912,10],[16777216,10],[26214400,15],[33554432,22],[44236800,2],[58982400,6],[67108864,6],[134217728,6],[167772160,6]]),Si=[],Ii=e=>Math.ceil(Number(e)/16)*16,Ls=e=>{for(let t=0;t<Si.length;t++){let i=Si[t];if(e<=i)return i}return Math.ceil(e/16)*16},Vs=1,Mr=()=>Vs++,ya=async(e,t,i,a)=>{let n=Ii(i),r=e.device.createBuffer({size:n,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let o=e.getCommandEncoder();e.endComputePass(),o.copyBufferToBuffer(t,0,r,0,n),e.flush(),await r.mapAsync(GPUMapMode.READ);let u=r.getMappedRange();if(a){let p=a();return p.set(new Uint8Array(u,0,i)),p}else return new Uint8Array(u.slice(0,i))}finally{r.destroy()}},js=class{constructor(e){this.backend=e,this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.buffersPending=[],this.capturedPendingBuffers=new Map;for(let[t]of Dr)Si.push(t),this.freeBuffers.set(t,[]),this.freeUniformBuffers.set(t,[]);this.sessionCount=0}upload(e,t){let i=t.buffer,a=t.byteOffset,n=t.byteLength,r=Ii(n),o=this.storageCache.get(e);if(!o)throw new Error("gpu data for uploading does not exist");if(Number(o.originalSize)!==n)throw new Error(`inconsistent data size. gpu data size=${o.originalSize}, data size=${n}`);let u=this.backend.device.createBuffer({mappedAtCreation:!0,size:r,usage:GPUBufferUsage.MAP_WRITE|GPUBufferUsage.COPY_SRC}),p=u.getMappedRange();new Uint8Array(p).set(new Uint8Array(i,a,n)),u.unmap();let d=this.backend.device.createCommandEncoder();d.copyBufferToBuffer(u,0,o.gpuData.buffer,0,r),this.backend.device.queue.submit([d.finish()]),u.destroy(),de("verbose",()=>`[WebGPU] GpuDataManager.upload(id=${e})`)}memcpy(e,t){let i=this.storageCache.get(e);if(!i)throw new Error("source gpu data for memcpy does not exist");let a=this.storageCache.get(t);if(!a)throw new Error("destination gpu data for memcpy does not exist");if(i.originalSize!==a.originalSize)throw new Error("inconsistent source and destination gpu data size");let n=Ii(i.originalSize),r=this.backend.getCommandEncoder();this.backend.endComputePass(),r.copyBufferToBuffer(i.gpuData.buffer,0,a.gpuData.buffer,0,n)}registerExternalBuffer(e,t,i){let a;if(i){if(a=i[0],e===i[1])return de("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${a}, buffer is the same, skip.`),a;if(this.backend.capturedCommandList.has(this.backend.currentSessionId))throw new Error(`Registering a different external buffer under graph capture mode is not supported yet.
             Please use the previous external buffer!`)}else a=Mr();return this.storageCache.set(a,{gpuData:{id:a,type:0,buffer:e},originalSize:t}),de("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${a}, registered.`),a}unregisterExternalBuffer(e){e!==void 0&&(this.storageCache.delete(e),de("verbose",()=>`[WebGPU] GpuDataManager.unregisterExternalBuffer() => id=${e}`))}create(e,t=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST){let i=Ls(e),a,n=(t&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE,r=(t&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM;if(n||r){let u=(n?this.freeBuffers:this.freeUniformBuffers).get(i);u?u.length>0?a=u.pop():a=this.backend.device.createBuffer({size:i,usage:t}):a=this.backend.device.createBuffer({size:i,usage:t})}else a=this.backend.device.createBuffer({size:i,usage:t});let o={id:Mr(),type:0,buffer:a};return this.storageCache.set(o.id,{gpuData:o,originalSize:Number(e)}),de("verbose",()=>`[WebGPU] GpuDataManager.create(size=${e}) => id=${o.id}`),o}get(e){var t;return(t=this.storageCache.get(e))==null?void 0:t.gpuData}release(e){let t=typeof e=="bigint"?Number(e):e,i=this.storageCache.get(t);if(!i){if(this.storageCache.size===0)return 0;throw new Error("releasing data does not exist")}return de("verbose",()=>`[WebGPU] GpuDataManager.release(id=${t}), gpuDataId=${i.gpuData.id}`),this.storageCache.delete(t),this.buffersPending.push(i.gpuData.buffer),i.originalSize}async download(e,t){let i=this.storageCache.get(Number(e));if(!i)throw new Error("data does not exist");await ya(this.backend,i.gpuData.buffer,i.originalSize,t)}refreshPendingBuffers(){if(this.buffersPending.length!==0)if(this.backend.sessionStatus==="default"){for(let e of this.buffersPending){let t=Dr.get(e.size);if((e.usage&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE){let i=this.freeBuffers.get(e.size)||[];t===void 0||i.length>=t?e.destroy():i.push(e)}else if((e.usage&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM){let i=this.freeUniformBuffers.get(e.size)||[];t===void 0||i.length>=t?e.destroy():i.push(e)}else e.destroy()}this.buffersPending=[]}else{let e=this.capturedPendingBuffers.get(this.backend.currentSessionId);e||(e=[],this.capturedPendingBuffers.set(this.backend.currentSessionId,e));for(let t of this.buffersPending)e.push(t);this.buffersPending=[]}}dispose(){this.freeBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.freeUniformBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache.forEach(e=>{e.gpuData.buffer.destroy()}),this.capturedPendingBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.capturedPendingBuffers=new Map}onCreateSession(){this.sessionCount+=1}onReleaseSession(e){let t=this.capturedPendingBuffers.get(e);t&&(t.forEach(i=>{i.destroy()}),this.capturedPendingBuffers.delete(e)),this.sessionCount-=1,this.sessionCount===0&&(de("warning",()=>"[WebGPU] Clearing webgpu buffer cache"),this.storageCache.forEach(i=>{i.gpuData.buffer.destroy()}),this.storageCache=new Map)}},Bd=(...e)=>new js(...e)}),Gs,fe,xe=q(()=>{Gs=class{constructor(e){Object.assign(this,e)}get cacheKey(){return this.key||(this.key=Object.getOwnPropertyNames(this).sort().map(e=>`${this[e]}`).join(";")),this.key}},fe=e=>new Gs(e)}),jt,Ei,Se,ze,Q,ve,ba,Lt,yt,X,ei,N,K,Nd,Va,Hs,Dd,oe=q(()=>{re(),ne(),jt=64,Ei=(e,t)=>{if(t===3)throw new Error("vec3 has same alignment as vec4, use vec4 instead");switch(Number(e)){case 10:return t>1?`vec${t}<f16>`:"f16";case 1:return t>1?`vec${t}<f32>`:"f32";case 6:return t>1?`vec${t}<i32>`:"i32";case 12:return t>1?`vec${t}<u32>`:"u32";case 7:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","i32"];case 13:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","u32"];case 9:if(t!==4)throw new Error("bool must be vec4");return["u32","vec4<bool>"];case 22:return"i32";case 21:return"u32";default:throw new Error(`Unknown data type: ${e}`)}},Se=(e,t=1)=>{let i=Ei(e,t);return typeof i=="string"?i:i[0]},ze=(e,t=1)=>{let i=Ei(e,t);return typeof i=="string"?i:i[1]},Q=(...e)=>{let t=[];return e.forEach(i=>{i.length!==0&&t.push({type:12,data:i},{type:12,data:O.computeStrides(i)})}),t},ve=e=>e%4===0?4:e%2===0?2:1,ba=(e="f32",t,i="0")=>!t||t===1?`${e}(${i})`:`vec${t}<${e}>(${i})`,Lt=(e,t,i)=>e==="f32"?i:t===1?`f32(${i})`:`vec${t}<f32>(${i})`,yt=(e,t)=>t===4?`(${e}.x + ${e}.y + ${e}.z + ${e}.w)`:t===2?`(${e}.x + ${e}.y)`:t===3?`(${e}.x + ${e}.y + ${e}.z)`:e,X=(e,t,i,a)=>e.startsWith("uniforms.")&&i>4?typeof t=="string"?a==="f16"?`${e}[(${t}) / 8][(${t}) % 8 / 4][(${t}) % 8 % 4]`:`${e}[(${t}) / 4][(${t}) % 4]`:a==="f16"?`${e}[${Math.floor(t/8)}][${Math.floor(t%8/4)}][${t%8%4}]`:`${e}[${Math.floor(t/4)}][${t%4}]`:i>1?`${e}[${t}]`:e,ei=(e,t,i,a,n)=>{let r=typeof i=="number",o=r?i:i.length,u=[...new Array(o).keys()],p=o<2?"u32":o<=4?`vec${o}<u32>`:`array<u32, ${o}>`,d=Ei(t,n),f=typeof d=="string"?d:d[1],m=typeof d=="string"?d:d[0],g={indices:p,value:f,storage:m,tensor:t},_=D=>typeof D=="string"?D:`${D}u`,b={offsetToIndices:!1,indicesToOffset:!1,broadcastedIndicesToOffset:!1,set:!1,setByIndices:!1,get:!1,getByIndices:!1},w=r?"uniforms.":"",C=`${w}${e}_shape`,v=`${w}${e}_strides`,$="";for(let D=0;D<o-1;D++)$+=`
    let dim${D} = current / ${X(v,D,o)};
    let rest${D} = current % ${X(v,D,o)};
    indices[${D}] = dim${D};
    current = rest${D};
    `;$+=`indices[${o-1}] = current;`;let T=o<2?"":`
  fn o2i_${e}(offset: u32) -> ${g.indices} {
    var indices: ${g.indices};
    var current = offset;
    ${$}
    return indices;
  }`,k=D=>(b.offsetToIndices=!0,o<2?D:`o2i_${e}(${D})`),S=[];if(o>=2)for(let D=o-1;D>=0;D--)S.push(`${X(v,D,o)} * (indices[${D}])`);let E=o<2?"":`
  fn i2o_${e}(indices: ${g.indices}) -> u32 {
    return ${S.join("+")};
  }`,z=D=>(b.indicesToOffset=!0,o<2?D:`i2o_${e}(${D})`),R=(...D)=>o===0?"0u":`${g.indices}(${D.map(_).join(",")})`,M=(D,V)=>o<2?`${D}`:`${X(D,V,o)}`,L=(D,V,G)=>o<2?`${D}=${G};`:`${X(D,V,o)}=${G};`,J={},H=(D,V)=>{b.broadcastedIndicesToOffset=!0;let G=`${V.name}broadcastedIndicesTo${e}Offset`;if(G in J)return`${G}(${D})`;let ee=[];for(let Te=o-1;Te>=0;Te--){let Ye=V.indicesGet("outputIndices",Te+V.rank-o);ee.push(`${M(v,Te)} * (${Ye} % ${M(C,Te)})`)}return J[G]=`fn ${G}(outputIndices: ${V.type.indices}) -> u32 {
             return ${ee.length>0?ee.join("+"):"0u"};
           }`,`${G}(${D})`},j=(D,V)=>(()=>{if(g.storage===g.value)return`${e}[${D}]=${V};`;if(g.storage==="vec2<u32>"&&g.value==="i32")return`${e}[${D}]=vec2<u32>(u32(${V}), select(0u, 0xFFFFFFFFu, ${V} < 0));`;if(g.storage==="vec2<u32>"&&g.value==="u32")return`${e}[${D}]=vec2<u32>(u32(${V}), 0u);`;if(g.storage==="u32"&&g.value==="vec4<bool>")return`${e}[${D}]=dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(${V}));`;throw new Error(`not supported combination of storage type ${g.storage} and value type ${g.value} yet`)})(),le=D=>(()=>{if(g.storage===g.value)return`${e}[${D}]`;if(g.storage==="vec2<u32>"&&g.value==="i32")return`i32(${e}[${D}].x)`;if(g.storage==="vec2<u32>"&&g.value==="u32")return`u32(${e}[${D}].x)`;if(g.storage==="u32"&&g.value==="vec4<bool>")return`vec4<bool>(bool(${e}[${D}] & 0xFFu), bool(${e}[${D}] & 0xFF00u), bool(${e}[${D}] & 0xFF0000u), bool(${e}[${D}] & 0xFF000000u))`;throw new Error(`not supported combination of storage type ${g.storage} and value type ${g.value} yet`)})(),ae=o<2?"":`
  fn get_${e}ByIndices(indices: ${g.indices}) -> ${f} {
    return ${le(`i2o_${e}(indices)`)};
  }`,Z=o<2?"":(()=>{let D=u.map(G=>`d${G}: u32`).join(", "),V=u.map(G=>`d${G}`).join(", ");return`
  fn get_${e}(${D}) -> ${f} {
    return get_${e}ByIndices(${R(V)});
  }`})(),se=(...D)=>{if(D.length!==o)throw new Error(`indices length must be ${o}`);let V=D.map(_).join(",");return o===0?le("0u"):o===1?le(V[0]):(b.get=!0,b.getByIndices=!0,b.indicesToOffset=!0,`get_${e}(${V})`)},Y=D=>o<2?le(D):(b.getByIndices=!0,b.indicesToOffset=!0,`get_${e}ByIndices(${D})`),te=o<2?"":`
  fn set_${e}ByIndices(indices: ${g.indices}, value: ${f}) {
    ${j(`i2o_${e}(indices)`,"value")}
  }`,ge=o<2?"":(()=>{let D=u.map(G=>`d${G}: u32`).join(", "),V=u.map(G=>`d${G}`).join(", ");return`
  fn set_${e}(${D}, value: ${f}) {
    set_${e}ByIndices(${R(V)}, value);
  }`})();return{impl:()=>{let D=[],V=!1;return b.offsetToIndices&&(D.push(T),V=!0),b.indicesToOffset&&(D.push(E),V=!0),b.broadcastedIndicesToOffset&&(Object.values(J).forEach(G=>D.push(G)),V=!0),b.set&&(D.push(ge),V=!0),b.setByIndices&&(D.push(te),V=!0),b.get&&(D.push(Z),V=!0),b.getByIndices&&(D.push(ae),V=!0),!r&&V&&D.unshift(`const ${C} = ${g.indices}(${i.join(",")});`,`const ${v} = ${g.indices}(${O.computeStrides(i).join(",")});`),D.join(`
`)},type:g,offsetToIndices:k,indicesToOffset:z,broadcastedIndicesToOffset:H,indices:R,indicesGet:M,indicesSet:L,set:(...D)=>{if(D.length!==o+1)throw new Error(`indices length must be ${o}`);let V=D[o];if(typeof V!="string")throw new Error("value must be string");let G=D.slice(0,o).map(_).join(",");return o===0?j("0u",V):o===1?j(G[0],V):(b.set=!0,b.setByIndices=!0,b.indicesToOffset=!0,`set_${e}(${G}, ${V})`)},setByOffset:j,setByIndices:(D,V)=>o<2?j(D,V):(b.setByIndices=!0,b.indicesToOffset=!0,`set_${e}ByIndices(${D}, ${V});`),get:se,getByOffset:le,getByIndices:Y,usage:a,name:e,strides:v,shape:C,rank:o}},N=(e,t,i,a=1)=>ei(e,t,i,"input",a),K=(e,t,i,a=1)=>ei(e,t,i,"output",a),Nd=(e,t,i)=>ei(e,t,i,"atomicOutput",1),Va=(e,t,i,a=1)=>ei(e,t,i,"internal",a),Hs=class{constructor(e,t){this.normalizedDispatchGroup=e,this.limits=t,this.internalVariables=[],this.variables=[],this.uniforms=[],this.variableIndex=0}guardAgainstOutOfBoundsWorkgroupSizes(e){return`if (global_idx >= ${typeof e=="number"?`${e}u`:e}) { return; }`}mainStart(e=jt){let t=typeof e=="number"?e:e[0],i=typeof e=="number"?1:e[1],a=typeof e=="number"?1:e[2];if(t>this.limits.maxComputeWorkgroupSizeX||i>this.limits.maxComputeWorkgroupSizeY||a>this.limits.maxComputeWorkgroupSizeZ)throw new Error(`workgroup size [${t}, ${i}, ${a}] exceeds the maximum workgroup size [${this.limits.maxComputeWorkgroupSizeX}, ${this.limits.maxComputeWorkgroupSizeY}, ${this.limits.maxComputeWorkgroupSizeZ}].`);if(t*i*a>this.limits.maxComputeInvocationsPerWorkgroup)throw new Error(`workgroup size [${t}, ${i}, ${a}] exceeds the maximum workgroup invocations ${this.limits.maxComputeInvocationsPerWorkgroup}.`);let n=this.normalizedDispatchGroup[1]===1&&this.normalizedDispatchGroup[2]===1,r=n?`@builtin(global_invocation_id) global_id : vec3<u32>,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(local_invocation_id) local_id : vec3<u32>`:`@builtin(global_invocation_id) global_id : vec3<u32>,
                                             @builtin(local_invocation_id) local_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(num_workgroups) num_workgroups : vec3<u32>`,o=n?`let global_idx = global_id.x;
         let workgroup_index = workgroup_id.x;`:`let workgroup_index = workgroup_id.z * num_workgroups[0] * num_workgroups[1] +
             workgroup_id.y * num_workgroups[0] + workgroup_id.x;
         let global_idx = workgroup_index * ${t*i*a}u + local_idx;`;return`@compute @workgroup_size(${t}, ${i}, ${a})
  fn main(${r}) {
    ${o}
  `}appendVariableUniforms(e){e.rank!==0&&(e.shape.startsWith("uniforms.")&&this.uniforms.push({name:e.shape.replace("uniforms.",""),type:"u32",length:e.rank}),e.strides.startsWith("uniforms.")&&this.uniforms.push({name:e.strides.replace("uniforms.",""),type:"u32",length:e.rank}))}declareVariable(e,t){if(e.usage==="internal")throw new Error("cannot use internal variable with declareVariable(). use registerInternalVariables() instead.");this.variables.push(e),this.appendVariableUniforms(e);let i=e.usage==="input"?"read":"read_write",a=e.usage==="atomicOutput"?"atomic<i32>":e.type.storage;return`@group(0) @binding(${t}) var<storage, ${i}> ${e.name}: array<${a}>;`}declareVariables(...e){return e.map(t=>this.declareVariable(t,this.variableIndex++)).join(`
`)}registerInternalVariable(e){if(e.usage!=="internal")throw new Error("cannot use input or output variable with registerInternalVariable(). use declareVariables() instead.");this.internalVariables.push(e),this.appendVariableUniforms(e)}registerInternalVariables(...e){return e.forEach(t=>this.registerInternalVariable(t)),this}registerUniform(e,t,i=1){return this.uniforms.push({name:e,type:t,length:i}),this}registerUniforms(e){return this.uniforms=this.uniforms.concat(e),this}uniformDeclaration(){if(this.uniforms.length===0)return"";let e=[];for(let{name:t,type:i,length:a}of this.uniforms)if(a&&a>4)i==="f16"?e.push(`@align(16) ${t}:array<mat2x4<${i}>, ${Math.ceil(a/8)}>`):e.push(`${t}:array<vec4<${i}>, ${Math.ceil(a/4)}>`);else{let n=a==null||a===1?i:`vec${a}<${i}>`;e.push(`${t}:${n}`)}return`
      struct Uniforms { ${e.join(", ")} };
      @group(0) @binding(${this.variableIndex}) var<uniform> uniforms: Uniforms;`}get additionalImplementations(){return this.uniformDeclaration()+this.variables.map(e=>e.impl()).join(`
`)+this.internalVariables.map(e=>e.impl()).join(`
`)}get variablesInfo(){if(this.uniforms.length===0)return;let e=t=>[12,10,1,6][["u32","f16","f32","i32"].indexOf(t)];return this.uniforms.map(t=>[e(t.type),t.length??1])}},Dd=(e,t)=>new Hs(e,t)}),Fs,Pr,Ks,Zs,Ys,Xs,qe,Md,Pd,bt=q(()=>{re(),ne(),xe(),oe(),Fs=(e,t)=>{if(!e||e.length!==1)throw new Error("Transpose requires 1 input.");if(t.length!==0&&t.length!==e[0].dims.length)throw new Error(`perm size ${t.length} does not match input rank ${e[0].dims.length}`)},Pr=(e,t)=>t.length!==0?t:[...new Array(e).keys()].reverse(),Ks=(e,t)=>O.sortBasedOnPerm(e,Pr(e.length,t)),Zs=(e,t,i,a)=>{let n=`fn perm(i: ${a.type.indices}) -> ${i.type.indices} {
    var a: ${i.type.indices};`;for(let r=0;r<t;++r)n+=`a[${e[r]}]=i[${r}];`;return n+="return a;}"},Ys=(e,t)=>{let i=[],a=[];for(let n=0;n<e.length;++n)e[n]!==1&&i.push(e[n]),e[t[n]]!==1&&a.push(t[n]);return{newShape:i,newPerm:a}},Xs=(e,t)=>{let i=0;for(let a=0;a<e.length;++a)if(t[e[a]]!==1){if(e[a]<i)return!1;i=e[a]}return!0},qe=(e,t)=>{let i=e.dataType,a=e.dims.length,n=Pr(a,t),r=Ks(e.dims,n),o=e.dims,u=r,p=a<2||Xs(n,e.dims),d;if(p)return d=b=>{let w=N("input",i,o,4),C=K("output",i,u,4);return`
  ${b.registerUniform("output_size","u32").declareVariables(w,C)}
  ${b.mainStart()}
    ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    output[global_idx] = input[global_idx];
  }`},{name:"TransposeCopy",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let b=O.size(r);return{outputs:[{dims:r,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(b/64/4)},programUniforms:[{type:12,data:Math.ceil(b/4)}]}},getShaderSource:d};let{newShape:f,newPerm:m}=Ys(e.dims,n),g=O.areEqual(m,[2,3,1]),_=O.areEqual(m,[3,1,2]);if(f.length===2||g||_){o=g?[f[0],f[1]*f[2]]:_?[f[0]*f[1],f[2]]:f,u=[o[1],o[0]];let b=16;return d=w=>{let C=N("a",i,o.length),v=K("output",i,u.length);return`
  ${w.registerUniform("output_size","u32").declareVariables(C,v)}
  var<workgroup> tile : array<array<${v.type.value}, ${b+1}>, ${b}>;
  ${w.mainStart([b,b,1])}
    let stride = (uniforms.output_shape[1] - 1) / ${b} + 1;
    let workgroup_id_x = workgroup_index % stride;
    let workgroup_id_y = workgroup_index / stride;
    let input_col = workgroup_id_y * ${b}u + local_id.x;
    let input_row = workgroup_id_x * ${b}u + local_id.y;
    if (input_row < uniforms.a_shape[0] && input_col < uniforms.a_shape[1]) {
      tile[local_id.y][local_id.x] = ${C.getByIndices(`${C.type.indices}(input_row, input_col)`)};
    }
    workgroupBarrier();

    let output_col = workgroup_id_x * ${b}u + local_id.x;
    let output_row = workgroup_id_y * ${b}u + local_id.y;
    if (output_row < uniforms.output_shape[0] && output_col < uniforms.output_shape[1]) {
      ${v.setByIndices(`${v.type.indices}(output_row, output_col)`,"tile[local_id.x][local_id.y]")}
    }
  }`},{name:"TransposeShared",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let w=O.size(r);return{outputs:[{dims:r,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(u[1]/b),y:Math.ceil(u[0]/b)},programUniforms:[{type:12,data:w},...Q(o,u)]}},getShaderSource:d}}return d=b=>{let w=N("a",i,o.length),C=K("output",i,u.length);return`
  ${b.registerUniform("output_size","u32").declareVariables(w,C)}

  ${Zs(n,a,w,C)}

  ${b.mainStart()}
    ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${C.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${C.setByOffset("global_idx",w.getByIndices("aIndices"))}
  }`},{name:"Transpose",shaderCache:{hint:`${t}`,inputDependencies:["rank"]},getRunData:()=>{let b=O.size(r);return{outputs:[{dims:r,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(b/64)},programUniforms:[{type:12,data:b},...Q(o,u)]}},getShaderSource:d}},Md=(e,t)=>{Fs(e.inputs,t.perm),e.compute(qe(e.inputs[0],t.perm))},Pd=e=>fe({perm:e.perm})}),Qs,Js,eo,to,io,ro,ao,no,so,oo,Ve,Ud,qd,Wd,Ld,Vd,jd,Gd,Hd,Fd,Kd,zm=q(()=>{re(),ne(),oe(),ja(),bt(),Qs={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate * candidate",logSumExp:"bestValue + exp(candidate)",l1:"bestValue + abs(candidate)",l2:"bestValue + candidate * candidate",logSum:"bestValue + candidate"},Js={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate",logSumExp:"bestValue + candidate",l1:"bestValue + candidate",l2:"bestValue + candidate",logSum:"bestValue + candidate"},eo={max:"_A[offset]",min:"_A[offset]",mean:"0",sum:"0",prod:"1",sumSquare:"0",logSumExp:"0",l1:"0",l2:"0",logSum:"0"},to={max:"bestValue",min:"bestValue",sum:"bestValue",prod:"bestValue",sumSquare:"bestValue",logSumExp:"log(bestValue)",l1:"bestValue",l2:"sqrt(bestValue)",logSum:"log(bestValue)"},io=(e,t)=>{let i=[];for(let a=t-e;a<t;++a)i.push(a);return i},ro=(e,t)=>{let i=[],a=e.length;for(let r=0;r<a;r++)t.indexOf(r)===-1&&i.push(e[r]);let n=t.map(r=>e[r]);return[i,n]},ao=(e,t)=>{let i=e.length+t.length,a=[],n=0;for(let r=0;r<i;r++)t.indexOf(r)===-1?a.push(e[n++]):a.push(1);return a},no=(e,t)=>{for(let i=0;i<e.length;++i)if(e[e.length-i-1]!==t-1-i)return!1;return!0},so=(e,t)=>{let i=[];if(!no(e,t)){for(let a=0;a<t;++a)e.indexOf(a)===-1&&i.push(a);e.forEach(a=>i.push(a))}return i},oo=(e,t,i,a,n,r,o)=>{let u=i[0].dims,p=O.size(r),d=O.size(o),f=N("_A",i[0].dataType,u),m=K("output",n,r),g=64;p===1&&(g=256);let _=`
          var<workgroup> aBestValues : array<f32, ${g}>;
       `,b=w=>`
        ${w.registerUniform("reduceSize","u32").declareVariables(f,m)}
        ${_}
        fn DIV_CEIL(a : u32, b : u32) -> u32 {
          return ((a - 1u) / b + 1u);
         }
         ${w.mainStart(g)}

          let outputIndex = global_idx / ${g};
          let offset = outputIndex * uniforms.reduceSize;

          var bestValue = f32(${eo[a]});
          let Length = uniforms.reduceSize;
          for (var k = local_idx; k < Length; k = k + ${g}) {
           let candidate = f32(${f.getByOffset("offset + k")});
           bestValue = ${Qs[a]};
          }
          aBestValues[local_idx] = bestValue;
          workgroupBarrier();

         var reduceSize = min(Length, ${g}u);
         for (var currentSize = reduceSize / 2u; reduceSize > 1u;
             currentSize = reduceSize / 2u) {
           let interval = DIV_CEIL(reduceSize, 2u);
           if (local_idx < currentSize) {
            let candidate = aBestValues[local_idx + interval];
            bestValue = ${Js[a]};
            aBestValues[local_idx] = bestValue;
           }
           reduceSize = interval;
           workgroupBarrier();
         }

         if (local_idx == 0u) {
          ${m.setByOffset("outputIndex",`${a==="mean"?`${m.type.storage}(bestValue / f32(uniforms.reduceSize))`:`${m.type.storage}(${to[a]})`}`)};
         }
        }`;return{name:e,shaderCache:{hint:`${t};${g}`,inputDependencies:["type"]},getShaderSource:b,getRunData:()=>({outputs:[{dims:r,dataType:n}],dispatchGroup:{x:p},programUniforms:[{type:12,data:d}]})}},Ve=(e,t,i,a)=>{let n=e.inputs.length===1?i:wa(e.inputs,i),r=n.axes;r.length===0&&!n.noopWithEmptyAxes&&(r=e.inputs[0].dims.map((_,b)=>b));let o=O.normalizeAxes(r,e.inputs[0].dims.length),u=o,p=e.inputs[0],d=so(u,e.inputs[0].dims.length);d.length>0&&(p=e.compute(qe(e.inputs[0],d),{inputs:[0],outputs:[-1]})[0],u=io(u.length,p.dims.length));let[f,m]=ro(p.dims,u),g=f;n.keepDims&&(g=ao(f,o)),e.compute(oo(t,n.cacheKey,[p],a,e.inputs[0].dataType,g,m),{inputs:[p]})},Ud=(e,t)=>{Ve(e,"ReduceMeanShared",t,"mean")},qd=(e,t)=>{Ve(e,"ReduceL1Shared",t,"l1")},Wd=(e,t)=>{Ve(e,"ReduceL2Shared",t,"l2")},Ld=(e,t)=>{Ve(e,"ReduceLogSumExpShared",t,"logSumExp")},Vd=(e,t)=>{Ve(e,"ReduceMaxShared",t,"max")},jd=(e,t)=>{Ve(e,"ReduceMinShared",t,"min")},Gd=(e,t)=>{Ve(e,"ReduceProdShared",t,"prod")},Hd=(e,t)=>{Ve(e,"ReduceSumShared",t,"sum")},Fd=(e,t)=>{Ve(e,"ReduceSumSquareShared",t,"sumSquare")},Kd=(e,t)=>{Ve(e,"ReduceLogSumShared",t,"logSum")}}),je,uo,Vi,wa,Ge,lo,po,co,fo,ho,mo,go,_o,yo,bo,He,Zd,Yd,Xd,Qd,Jd,ep,tp,ip,rp,ap,ja=q(()=>{re(),ne(),xe(),oe(),zm(),je=e=>{if(!e||e.length===0||e.length>2)throw new Error("Reduce op requires 1 or 2 inputs.");if(e.length===2&&e[1].dims.length!==1)throw new Error("Invalid axes input dims.")},uo=e=>["","",`var value = ${e.getByIndices("input_indices")};`,""],Vi=(e,t,i,a,n,r,o=!1,u=!1)=>{let p=[],d=i[0].dims,f=d.length,m=O.normalizeAxes(n,f),g=!u&&m.length===0;d.forEach((w,C)=>{g||m.indexOf(C)>=0?o&&p.push(1):p.push(w)});let _=p.length,b=O.size(p);return{name:e,shaderCache:t,getShaderSource:w=>{let C=[],v=N("_A",i[0].dataType,f),$=K("output",r,_),T=a(v,$,m),k=T[2];for(let S=0,E=0;S<f;S++)g||m.indexOf(S)>=0?(o&&E++,k=`for(var j${S}: u32 = 0; j${S} < ${d[S]}; j${S}++) {
                  ${T[2].includes("last_index")?`let last_index = j${S};`:""}
                  ${v.indicesSet("input_indices",S,`j${S}`)}
                  ${k}
                }`):(C.push(`${v.indicesSet("input_indices",S,$.indicesGet("output_indices",E))};`),E++);return`

        ${w.registerUniform("output_size","u32").declareVariables(v,$)}

        ${w.mainStart()}
          ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          var input_indices: ${v.type.indices};
          let output_indices = ${$.offsetToIndices("global_idx")};

          ${C.join(`
`)}
          ${T[0]}       // init ops for reduce max/min
          ${T[1]}
          ${k}
          ${T[3]}
          ${T.length===4?$.setByOffset("global_idx","value"):T.slice(4).join(`
`)}
        }`},getRunData:()=>({outputs:[{dims:p,dataType:r}],dispatchGroup:{x:Math.ceil(b/64)},programUniforms:[{type:12,data:b},...Q(d,p)]})}},wa=(e,t)=>{let i=[];return e[1].dims[0]>0&&e[1].getBigInt64Array().forEach(a=>i.push(Number(a))),fe({axes:i,keepDims:t.keepDims,noopWithEmptyAxes:t.noopWithEmptyAxes})},Ge=(e,t,i,a)=>{let n=e.inputs,r=n.length===1?i:wa(n,i);e.compute(Vi(t,{hint:r.cacheKey,inputDependencies:["rank"]},[n[0]],r.noopWithEmptyAxes&&r.axes.length===0?uo:a,r.axes,n[0].dataType,r.keepDims,r.noopWithEmptyAxes),{inputs:[0]})},lo=(e,t)=>{je(e.inputs),Ge(e,"ReduceLogSum",t,(i,a)=>[`var value = ${a.type.storage}(0);`,"",`value += ${i.getByIndices("input_indices")};`,"value = log(value);"])},po=(e,t)=>{je(e.inputs),Ge(e,"ReduceL1",t,(i,a)=>[`var value = ${a.type.storage}(0);`,"",`value += abs(${i.getByIndices("input_indices")});`,""])},co=(e,t)=>{je(e.inputs),Ge(e,"ReduceL2",t,(i,a)=>[`var t = ${a.type.value}(0); var value = ${a.type.value}(0);`,"",`t = ${i.getByIndices("input_indices")}; value += (t * t);`,"value = sqrt(value);"])},fo=(e,t)=>{je(e.inputs),Ge(e,"ReduceLogSumExp",t,(i,a)=>[`var value = ${a.type.storage}(0);`,"",`value += exp(${i.getByIndices("input_indices")});`,"value = log(value);"])},ho=(e,t)=>{je(e.inputs),Ge(e,"ReduceMax",t,(i,a,n)=>{let r=[];for(let o=0;o<i.rank;o++)(n.indexOf(o)>=0||n.length===0)&&r.push(i.indicesSet("input_indices",o,0));return[`${r.join(`
`)}`,`var value = ${i.getByIndices("input_indices")};`,`value = max(value, ${i.getByIndices("input_indices")});`,""]})},mo=(e,t)=>{je(e.inputs),Ge(e,"ReduceMean",t,(i,a,n)=>{let r=1;for(let o=0;o<i.rank;o++)(n.indexOf(o)>=0||n.length===0)&&(r*=e.inputs[0].dims[o]);return["var sum = f32(0);","",`sum += f32(${i.getByIndices("input_indices")});`,`let value = ${a.type.value}(sum / ${r});`]})},go=(e,t)=>{je(e.inputs),Ge(e,"ReduceMin",t,(i,a,n)=>{let r=[];for(let o=0;o<i.rank;o++)(n.indexOf(o)>=0||n.length===0)&&r.push(`input_indices[${o}] = 0;`);return[`${r.join(`
`)}`,`var value = ${i.getByIndices("input_indices")};`,`value = min(value, ${i.getByIndices("input_indices")});`,""]})},_o=(e,t)=>{je(e.inputs),Ge(e,"ReduceProd",t,(i,a)=>[`var value = ${a.type.storage}(1);`,"",`value *= ${i.getByIndices("input_indices")};`,""])},yo=(e,t)=>{je(e.inputs),Ge(e,"ReduceSum",t,(i,a)=>[`var value = ${a.type.storage}(0);`,"",`value += ${i.getByIndices("input_indices")};`,""])},bo=(e,t)=>{je(e.inputs),Ge(e,"ReduceSumSquare",t,(i,a)=>[`var t = ${a.type.value}(0); var value = ${a.type.value}(0);`,"",`t = ${i.getByIndices("input_indices")}; value += t * t;`,""])},He=(e,t,i)=>{if(t.length===0)return i;let a=1,n=1;for(let r=0;r<t.length;r++)t.indexOf(r)===-1?a*=e[r]:n*=e[r];return n<32&&a>1024},Zd=(e,t)=>{He(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?mo(e,t):Ud(e,t)},Yd=(e,t)=>{He(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?po(e,t):qd(e,t)},Xd=(e,t)=>{He(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?co(e,t):Wd(e,t)},Qd=(e,t)=>{He(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?fo(e,t):Ld(e,t)},Jd=(e,t)=>{He(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?ho(e,t):Vd(e,t)},ep=(e,t)=>{He(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?go(e,t):jd(e,t)},tp=(e,t)=>{He(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?_o(e,t):Gd(e,t)},ip=(e,t)=>{He(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?yo(e,t):Hd(e,t)},rp=(e,t)=>{He(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?bo(e,t):Fd(e,t)},ap=(e,t)=>{He(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?lo(e,t):Kd(e,t)}}),Ur,np,sp,$a,Am=q(()=>{re(),xe(),ja(),Ur=e=>{if(!e||e.length===0||e.length>2)throw new Error("ArgMinMaxOp op requires 1 or 2 inputs.");if(e[0].dataType!==1)throw new Error("Invalid input type.")},np=(e,t)=>{Ur(e.inputs);let i=(a,n,r)=>{let o=[];for(let u=0;u<a.rank;u++)(r.indexOf(u)>=0||r.length===0)&&o.push(`input_indices[${u}] = 0;`);return[`${o.join(`
`)}`,`var value = ${a.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${a.getByIndices("input_indices")} ${t.selectLastIndex>0?"<=":"<"} value) {
         value = ${a.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",n.setByOffset("global_idx","best_index")]};e.compute(Vi("ArgMin",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],i,[t.axis],7,t.keepDims),{inputs:[0]})},sp=(e,t)=>{Ur(e.inputs);let i=(a,n,r)=>{let o=[];for(let u=0;u<a.rank;u++)(r.indexOf(u)>=0||r.length===0)&&o.push(`input_indices[${u}] = 0;`);return[`${o.join(`
`)}`,`var value = ${a.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${a.getByIndices("input_indices")} ${t.selectLastIndex>0?">=":">"} value) {
         value = ${a.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",n.setByOffset("global_idx","best_index")]};e.compute(Vi("argMax",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],i,[t.axis],7,t.keepDims),{inputs:[0]})},$a=e=>fe(e)}),wo,zi,$o,vo,xo,fi,Co,op,Ga=q(()=>{re(),ne(),La(),oe(),wo=(e,t)=>{let i=e[0],a=e[1],n=e[2],r=e[3],o=e[4],u=e[5];if(o&&u)throw new Error("Attention cannot have both past and attention_bias");if(i.dims.length!==3)throw new Error('Input "input" must have 3 dimensions');let p=i.dims[0],d=i.dims[1],f=i.dims[2];if(n.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimensions');if(a.dims.length!==2)throw new Error('Input "weights" is expected to have 2 dimensions');if(a.dims[0]!==f)throw new Error("Input 1 dimension 0 should have same length as dimension 2 of input 0");if(n.dims[0]!==a.dims[1])throw new Error('Input "bias" dimension 0 should have same length as dimension 1 of input "weights"');let m=n.dims[0]/3,g=m,_=g;if(t.qkvHiddenSizes.length>0){if(t.qkvHiddenSizes.length!==3)throw new Error("qkv_hidden_sizes attribute should have 3 elements");for(let T of t.qkvHiddenSizes)if(T%t.numHeads!==0)throw new Error("qkv_hidden_sizes should be divisible by num_heads");m=t.qkvHiddenSizes[0],g=t.qkvHiddenSizes[1],_=t.qkvHiddenSizes[2]}let b=d;if(m!==g)throw new Error("qkv_hidden_sizes first element should be same as the second");if(n.dims[0]!==m+g+_)throw new Error('Input "bias" dimension 0 should have same length as sum of Q/K/V hidden sizes');let w=0;if(o){if(g!==_)throw new Error('Input "past" expect k_hidden_size == v_hidden_size');if(o.dims.length!==5)throw new Error('Input "past" must have 5 dimensions');if(o.dims[0]!==2)throw new Error('Input "past" first dimension must be 2');if(o.dims[1]!==p)throw new Error('Input "past" second dimension must be batch_size');if(o.dims[2]!==t.numHeads)throw new Error('Input "past" third dimension must be num_heads');if(o.dims[4]!==g/t.numHeads)throw new Error('Input "past" fifth dimension must be k_hidden_size / num_heads');t.pastPresentShareBuffer||(w=o.dims[3])}let C=b+w,v=-1,$=0;if(r)throw new Error("Mask not supported");if(o)throw new Error("past is not supported");if(u){if(u.dims.length!==4)throw new Error('Input "attention_bias" must have 4 dimensions');if(u.dims[0]!==p||u.dims[1]!==t.numHeads||u.dims[2]!==d||u.dims[3]!==C)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:p,sequenceLength:d,pastSequenceLength:w,kvSequenceLength:b,totalSequenceLength:C,maxSequenceLength:v,inputHiddenSize:f,hiddenSize:m,vHiddenSize:_,headSize:Math.floor(m/t.numHeads),vHeadSize:Math.floor(_/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:$,scale:t.scale,broadcastResPosBias:!1,passPastInKv:!1,qkvFormat:1}},zi=(e,t,i)=>t&&e?`
      let total_sequence_length_input = u32(${t.getByOffset("0")});
      let present_sequence_length = max(total_sequence_length_input, uniforms.past_sequence_length);
      let is_subsequent_prompt: bool = sequence_length > 1 && sequence_length != total_sequence_length_input;
      let is_first_prompt: bool = is_subsequent_prompt == false && sequence_length == total_sequence_length_input;
      total_sequence_length = u32(${e==null?void 0:e.getByOffset("batchIdx")}) + 1;
      var past_sequence_length: u32 = 0;
      if (is_first_prompt == false) {
        past_sequence_length = total_sequence_length - sequence_length;
      }
       `:`
    ${i?"let past_sequence_length = uniforms.past_sequence_length":""};
    let present_sequence_length = total_sequence_length;
    `,$o=(e,t,i,a,n,r,o,u)=>{let p=ve(o?1:r),d=64,f=r/p;f<d&&(d=32);let m=Math.ceil(r/p/d),g=[{type:12,data:t},{type:12,data:i},{type:12,data:a},{type:12,data:n},{type:12,data:f},{type:12,data:m}],_=Se(e.dataType,p),b=ze(1,p),w=["type"];o&&w.push("type"),u&&w.push("type");let C=v=>{let $=K("x",e.dataType,e.dims,p),T=[$],k=o?N("seq_lens",o.dataType,o.dims):void 0;k&&T.push(k);let S=u?N("total_sequence_length_input",u.dataType,u.dims):void 0;S&&T.push(S);let E=ze(e.dataType),z=[{name:"batch_size",type:"u32"},{name:"num_heads",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"sequence_length",type:"u32"},{name:"total_sequence_length",type:"u32"},{name:"elements_per_thread",type:"u32"}];return`
  var<workgroup> thread_max: array<f32, ${d}>;
  var<workgroup> thread_sum: array<f32, ${d}>;
  ${v.registerUniforms(z).declareVariables(...T)}
  ${v.mainStart([d,1,1])}
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let sequence_length = uniforms.sequence_length;
    var total_sequence_length = uniforms.total_sequence_length;
    ${zi(k,S,!1)}
    let local_offset = local_idx * uniforms.elements_per_thread;
    let offset = (global_idx / ${d}) * uniforms.total_sequence_length + local_offset;
    let seq_causal_length = ${o?"u32(past_sequence_length + workgroup_id.y + 1)":"total_sequence_length"};
    var thread_max_vector = ${b}(-3.402823e+38f);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      thread_max_vector = max(${b}(x[offset + i]), thread_max_vector);
    }
    thread_max[local_idx] = ${(()=>{switch(p){case 1:return"thread_max_vector";case 2:return"max(thread_max_vector.x, thread_max_vector.y)";case 4:return"max(max(thread_max_vector.x, thread_max_vector.y), max(thread_max_vector.z, thread_max_vector.w))";default:throw new Error(`Unsupported components: ${p}`)}})()};
    workgroupBarrier();

    var max_value =  f32(-3.402823e+38f);
    for (var i = 0u; i < ${d}; i++) {
      max_value = max(thread_max[i], max_value);
    }

    var sum_vector = ${b}(0);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      sum_vector += exp(${b}(x[offset + i]) - max_value);
    }
    thread_sum[local_idx] = ${(()=>{switch(p){case 1:return"sum_vector";case 2:return"sum_vector.x + sum_vector.y";case 4:return"sum_vector.x + sum_vector.y + sum_vector.z + sum_vector.w";default:throw new Error(`Unsupported components: ${p}`)}})()};
    workgroupBarrier();

    var sum: f32 = 0;
    for (var i = 0u; i < ${d}; i++) {
      sum += thread_sum[i];
    }

    if (sum == 0) {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        x[offset + i] = ${$.type.value}(${E}(1.0) / ${E}(seq_causal_length));
      }
    } else {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        var f32input = ${b}(x[offset + i]);
        x[offset + i] = ${$.type.value}(exp(f32input - max_value) / sum);
      }
    }
      ${o?`
        for (var total_seq_id: u32 = seq_causal_length; total_seq_id + local_offset < uniforms.total_sequence_length; total_seq_id++) {
          x[offset + total_seq_id] = ${$.type.value}(${E}(0));
        }`:""};
  }`};return{name:"AttentionProbsSoftmax",shaderCache:{hint:`${d};${_};${p}`,inputDependencies:w},getShaderSource:C,getRunData:()=>({outputs:[],dispatchGroup:{x:1,y:n,z:t*i},programUniforms:g})}},vo=(e,t,i,a,n,r,o,u,p)=>{let d=o+r.kvSequenceLength,f=[r.batchSize,r.numHeads,r.sequenceLength,d],m=e>1&&a,g=r.kvNumHeads?r.kvNumHeads:r.numHeads,_=m?[r.batchSize,g,d,r.headSize]:void 0,b=r.nReps?r.nReps:1,w=r.scale===0?1/Math.sqrt(r.headSize):r.scale,C=ve(r.headSize),v=r.headSize/C,$=12,T={x:Math.ceil(d/$),y:Math.ceil(r.sequenceLength/$),z:r.batchSize*r.numHeads},k=[{type:12,data:r.sequenceLength},{type:12,data:v},{type:12,data:d},{type:12,data:r.numHeads},{type:12,data:r.headSize},{type:1,data:w},{type:12,data:o},{type:12,data:r.kvSequenceLength},{type:12,data:b}],S=m&&a&&O.size(a.dims)>0,E=["type","type"];S&&E.push("type"),n&&E.push("type"),u&&E.push("type"),p&&E.push("type");let z=[{dims:f,dataType:t.dataType,gpuDataType:0}];m&&z.push({dims:_,dataType:t.dataType,gpuDataType:0});let R=M=>{let L=N("q",t.dataType,t.dims,C),J=N("key",i.dataType,i.dims,C),H=[L,J];if(S){let te=N("past_key",a.dataType,a.dims,C);H.push(te)}n&&H.push(N("attention_bias",n.dataType,n.dims));let j=u?N("seq_lens",u.dataType,u.dims):void 0;j&&H.push(j);let le=p?N("total_sequence_length_input",p.dataType,p.dims):void 0;le&&H.push(le);let ae=K("output",t.dataType,f),Z=[ae];m&&Z.push(K("present_key",t.dataType,_,C));let se=ze(1,C),Y=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"alpha",type:"f32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${$}u;

  var<workgroup> tileQ: array<${L.type.storage}, ${$*$}>;
  var<workgroup> tileK: array<${L.type.storage}, ${$*$}>;
  ${M.registerUniforms(Y).declareVariables(...H,...Z)}
  ${M.mainStart([$,$,1])}
    // x holds the N and y holds the M
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let kvHeadIdx = ${b===1?"headIdx":"headIdx / uniforms.n_reps"};
    let kv_num_heads = ${b===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let m = workgroup_id.y * TILE_SIZE;
    let n = workgroup_id.x * TILE_SIZE;
    let sequence_length = uniforms.M;
    var total_sequence_length = uniforms.N;
    ${zi(j,le,!0)}
    let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx;
    let qOffset = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
    ${S&&m?"let pastKeyOffset = absKvHeadIdx * uniforms.past_sequence_length * uniforms.K;":""};
    let kOffset = absKvHeadIdx * uniforms.kv_sequence_length * uniforms.K;
    ${m?"let presentKeyOffset = absKvHeadIdx * uniforms.N * uniforms.K;":""}
    var value = ${se}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (global_id.y < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = q[qOffset + local_id.y * uniforms.K + w + local_id.x];
      }
      if (n + local_id.y < uniforms.N && w + local_id.x < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
      ${S&&m?`
              if (n + local_id.y < past_sequence_length) {
                tileK[idx] = past_key[pastKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
              } else if (n + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
                tileK[idx] = key[kOffset + (n + local_id.y - past_sequence_length) * uniforms.K + w + local_id.x];
              }`:`
          if (n + local_id.y < uniforms.kv_sequence_length) {
            tileK[idx] = key[kOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
          }`}
      ${m?`if (n + local_id.y < present_sequence_length) {
        present_key[presentKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x] = tileK[idx];
      }`:""}
      }
      workgroupBarrier();

      for (var k: u32 = 0u; k < TILE_SIZE && w+k < uniforms.K; k++) {
          value += ${se}(tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * local_id.x + k]);
      }

      workgroupBarrier();
    }

    if (global_id.y < uniforms.M && global_id.x < total_sequence_length) {
      let headOffset = workgroup_id.z * uniforms.M * uniforms.N;
      let outputIdx = headOffset + global_id.y * uniforms.N + global_id.x;
      var sum: f32 = ${(()=>{switch(C){case 1:return"value";case 2:return"value.x + value.y";case 4:return"value.x + value.y + value.z + value.w";default:throw new Error(`Unsupported components: ${C}`)}})()};
        output[outputIdx] = ${ae.type.value} (sum * uniforms.alpha) + ${n?"attention_bias[outputIdx]":"0.0"};
    }
  }`};return{name:"AttentionProbs",shaderCache:{hint:`${C};${n!==void 0};${a!==void 0};${e}`,inputDependencies:E},getRunData:()=>({outputs:z,dispatchGroup:T,programUniforms:k}),getShaderSource:R}},xo=(e,t,i,a,n,r,o=void 0,u=void 0)=>{let p=r+n.kvSequenceLength,d=n.nReps?n.nReps:1,f=n.vHiddenSize*d,m=e>1&&a,g=n.kvNumHeads?n.kvNumHeads:n.numHeads,_=m?[n.batchSize,g,p,n.headSize]:void 0,b=[n.batchSize,n.sequenceLength,f],w=12,C={x:Math.ceil(n.vHeadSize/w),y:Math.ceil(n.sequenceLength/w),z:n.batchSize*n.numHeads},v=[{type:12,data:n.sequenceLength},{type:12,data:p},{type:12,data:n.vHeadSize},{type:12,data:n.numHeads},{type:12,data:n.headSize},{type:12,data:f},{type:12,data:r},{type:12,data:n.kvSequenceLength},{type:12,data:d}],$=m&&a&&O.size(a.dims)>0,T=["type","type"];$&&T.push("type"),o&&T.push("type"),u&&T.push("type");let k=[{dims:b,dataType:t.dataType,gpuDataType:0}];m&&k.push({dims:_,dataType:t.dataType,gpuDataType:0});let S=E=>{let z=N("probs",t.dataType,t.dims),R=N("v",i.dataType,i.dims),M=[z,R];$&&M.push(N("past_value",a.dataType,a.dims));let L=o?N("seq_lens",o.dataType,o.dims):void 0;o&&M.push(L);let J=u?N("total_sequence_length_input",u.dataType,u.dims):void 0;u&&M.push(J);let H=[K("output",t.dataType,b)];m&&H.push(K("present_value",t.dataType,_));let j=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"v_hidden_size",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${w}u;
  var<workgroup> tileQ: array<${z.type.value}, ${w*w}>;
  var<workgroup> tileV: array<${z.type.value}, ${w*w}>;
  ${E.registerUniforms(j).declareVariables(...M,...H)}
  ${E.mainStart([w,w,1])}
   let headIdx = workgroup_id.z % uniforms.num_heads;
   let batchIdx = workgroup_id.z / uniforms.num_heads;
   let kvHeadIdx = ${d===1?"headIdx":"headIdx / uniforms.n_reps"};
   let kv_num_heads = ${d===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
   let m = global_id.y;
   let n = global_id.x;
   let sequence_length = uniforms.M;
   var total_sequence_length = uniforms.K;
   ${zi(L,J,!0)}
   let offsetA = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
   let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx; // kvHeadIdx is relative to the batch
   ${$&&m?"let pastValueOffset = absKvHeadIdx * uniforms.N * uniforms.past_sequence_length + n;":""};
   let vOffset = absKvHeadIdx * uniforms.N * uniforms.kv_sequence_length + n;
   ${m?"let presentValueOffset = absKvHeadIdx * uniforms.N * uniforms.K + n;":""}
   var value = ${z.type.storage}(0);
   for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = probs[offsetA + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
        ${$&&m?`
        if (w + local_id.y < past_sequence_length) {
          tileV[idx] = past_value[pastValueOffset + (w + local_id.y) * uniforms.N];
        } else if (w + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
          tileV[idx] = v[vOffset + (w + local_id.y - past_sequence_length) * uniforms.N];
        }
      `:`
            if (w + local_id.y < uniforms.kv_sequence_length) {
              tileV[idx] = v[vOffset + (w + local_id.y) * uniforms.N];
            }`}
        ${m?`
            if (w + local_id.y < present_sequence_length) {
          present_value[presentValueOffset + (w + local_id.y) * uniforms.N] = tileV[idx];
        }`:""}
      }
     workgroupBarrier();
     for (var k: u32 = 0u; k < TILE_SIZE && w+k < total_sequence_length; k++) {
       value += tileQ[TILE_SIZE * local_id.y + k] * tileV[TILE_SIZE * k + local_id.x];
     }
     workgroupBarrier();
   }

   // we need to transpose output from BNSH_v to BSND_v
   if (m < uniforms.M && n < uniforms.N) {
     let outputIdx = batchIdx * uniforms.M * uniforms.v_hidden_size + m * uniforms.v_hidden_size
       + headIdx * uniforms.N + n;
     output[outputIdx] = value;
   }
  }`};return{name:"AttentionScore",shaderCache:{hint:`${a!==void 0};${e}`,inputDependencies:T},getRunData:()=>({outputs:k,dispatchGroup:C,programUniforms:v}),getShaderSource:S}},fi=(e,t,i,a,n,r,o,u,p,d,f=void 0,m=void 0)=>{let g=Math.min(e.outputCount,1+(o?1:0)+(u?1:0)),_=g>1?d.pastSequenceLength:0,b=_+d.kvSequenceLength,w=p&&O.size(p.dims)>0?p:void 0,C=[t,i];g>1&&o&&O.size(o.dims)>0&&C.push(o),w&&C.push(w),f&&C.push(f),m&&C.push(m);let v=e.compute(vo(g,t,i,o,w,d,_,f,m),{inputs:C,outputs:g>1?[-1,1]:[-1]})[0];e.compute($o(v,d.batchSize,d.numHeads,_,d.sequenceLength,b,f,m),{inputs:f&&m?[v,f,m]:[v],outputs:[]});let $=[v,a];g>1&&u&&O.size(u.dims)>0&&$.push(u),f&&$.push(f),m&&$.push(m),e.compute(xo(g,v,a,u,d,_,f,m),{inputs:$,outputs:g>1?[0,2]:[0]})},Co=(e,t)=>{let i=[t.batchSize,t.numHeads,t.sequenceLength,t.headSize],a=t.sequenceLength,n=t.inputHiddenSize,r=t.headSize,o=12,u={x:Math.ceil(t.headSize/o),y:Math.ceil(t.sequenceLength/o),z:t.batchSize*t.numHeads},p=[e.inputs[0],e.inputs[1],e.inputs[2]],d=[{type:12,data:a},{type:12,data:n},{type:12,data:r},{type:12,data:t.numHeads},{type:12,data:t.headSize},{type:12,data:t.hiddenSize},{type:12,data:t.hiddenSize+t.hiddenSize+t.vHiddenSize}],f=m=>{let g=K("output_q",p[0].dataType,i),_=K("output_k",p[0].dataType,i),b=K("output_v",p[0].dataType,i),w=N("input",p[0].dataType,p[0].dims),C=N("weight",p[1].dataType,p[1].dims),v=N("bias",p[2].dataType,p[2].dims),$=w.type.storage,T=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"hidden_size",type:"u32"},{name:"ldb",type:"u32"}];return`
  const TILE_SIZE = ${o}u;
  var<workgroup> tileInput: array<${$}, ${o*o}>;
  var<workgroup> tileWeightQ: array<${$}, ${o*o}>;
  var<workgroup> tileWeightK: array<${$}, ${o*o}>;
  var<workgroup> tileWeightV: array<${$}, ${o*o}>;
  ${m.registerUniforms(T).declareVariables(w,C,v,g,_,b)}
  ${m.mainStart([o,o,1])}
    let batchIndex = workgroup_id.z / uniforms.num_heads;
    let headNumber = workgroup_id.z % uniforms.num_heads;
    let m = global_id.y;
    let n = global_id.x;

    let inputOffset = batchIndex * (uniforms.M * uniforms.K) + m * uniforms.K;
    let biasOffsetQ = headNumber * uniforms.head_size;
    let biasOffsetK = uniforms.hidden_size + biasOffsetQ;
    let biasOffsetV = uniforms.hidden_size + biasOffsetK;

    var valueQ = ${$}(0);
    var valueK = ${$}(0);
    var valueV = ${$}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileInput[TILE_SIZE * local_id.y + local_id.x] = input[inputOffset + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        let offset = n + (w + local_id.y) * uniforms.ldb;
        tileWeightQ[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetQ + offset];
        tileWeightK[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetK + offset];
        tileWeightV[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetV + offset];
      }
      workgroupBarrier();
      for (var k: u32 = 0u; k<TILE_SIZE && w+k < uniforms.K; k++) {
        let inputTileOffset = TILE_SIZE * local_id.y + k;
        let weightTileOffset = TILE_SIZE * k + local_id.x;
        valueQ += tileInput[inputTileOffset] * tileWeightQ[weightTileOffset];
        valueK += tileInput[inputTileOffset] * tileWeightK[weightTileOffset];
        valueV += tileInput[inputTileOffset] * tileWeightV[weightTileOffset];
      }

      workgroupBarrier();
    }

    let headOffset = (m * uniforms.N + n) % uniforms.head_size;
    valueQ += bias[headOffset + biasOffsetQ];
    valueK += bias[headOffset + biasOffsetK];
    valueV += bias[headOffset + biasOffsetV];

    let offset = workgroup_id.z * uniforms.M * uniforms.N;
    if (m < uniforms.M && n < uniforms.N) {
      let outputIdx = offset + m * uniforms.N + n;
      output_q[outputIdx] = valueQ;
      output_k[outputIdx] = valueK;
      output_v[outputIdx] = valueV;
    }
  }`};return e.compute({name:"AttentionPrepare",shaderCache:{inputDependencies:["type","type","type"]},getRunData:()=>({outputs:[{dims:i,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:i,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:i,dataType:e.inputs[0].dataType,gpuDataType:0}],dispatchGroup:u,programUniforms:d}),getShaderSource:f},{inputs:p,outputs:[-1,-1,-1]})},op=(e,t)=>{let i=wo(e.inputs,t),[a,n,r]=Co(e,i);return fi(e,a,n,r,e.inputs[4],void 0,void 0,void 0,e.inputs[5],i)}}),To,ko,So,up,Om=q(()=>{Le(),re(),ne(),xe(),oe(),To=(e,t)=>{if(!e||e.length!==5)throw new Error("BatchNormalization requires 5 inputs");let i=(a,n,r)=>{let o=n.length;if(o!==a.length)throw new Error(`${r}: num dimensions != ${o}`);n.forEach((u,p)=>{if(u!==a[p])throw new Error(`${r}: dim[${p}] do not match`)})};if(e[0].dims.length>1){let a=t.format==="NHWC"?t.spatial?e[0].dims.slice(-1):e[0].dims.slice(-1).concat(e[0].dims.slice(1,e[0].dims.length-1)):e[0].dims.slice(1,t.spatial?2:void 0);i(e[1].dims,a,"Invalid input scale"),i(e[2].dims,a,"Invalid input B"),i(e[3].dims,a,"Invalid input mean"),i(e[4].dims,a,"Invalid input var")}else i(e[1].dims,[1],"Invalid input scale"),i(e[2].dims,[1],"Invalid input B"),i(e[3].dims,[1],"Invalid input mean"),i(e[4].dims,[1],"Invalid input var")},ko=(e,t)=>{let{epsilon:i,spatial:a,format:n}=t,r=e[0].dims,o=a?ve(r[r.length-1]):1,u=n==="NHWC"&&r.length>1?o:1,p=O.size(r)/o,d=a,f=d?r.length:r,m=N("x",e[0].dataType,e[0].dims,o),g=N("scale",e[1].dataType,e[1].dims,u),_=N("bias",e[2].dataType,e[2].dims,u),b=N("inputMean",e[3].dataType,e[3].dims,u),w=N("inputVar",e[4].dataType,e[4].dims,u),C=K("y",e[0].dataType,f,o),v=()=>{let T="";if(a)T=`let cOffset = ${r.length===1?"0u":n==="NHWC"?`outputIndices[${r.length-1}] / ${o}`:"outputIndices[1]"};`;else if(n==="NCHW")T=`
            ${C.indicesSet("outputIndices","0","0")}
            let cOffset = ${C.indicesToOffset("outputIndices")};`;else{T=`var cIndices = ${g.type.indices}(0);
                       cIndices[0] = outputIndices[${r.length-1}];`;for(let k=1;k<g.rank;k++)T+=`cIndices[${k}] = outputIndices[${k}];`;T+=`let cOffset = ${g.indicesToOffset("cIndices")};`}return T},$=T=>`
  const epsilon = ${i};
  ${T.registerUniform("outputSize","u32").declareVariables(m,g,_,b,w,C)}
  ${T.mainStart()}
  ${T.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
    var outputIndices = ${C.offsetToIndices(`global_idx * ${o}`)};
    ${v()}
    let scale = ${g.getByOffset("cOffset")};
    let bias = ${_.getByOffset("cOffset")};
    let inputMean = ${b.getByOffset("cOffset")};
    let inputVar = ${w.getByOffset("cOffset")};
    let x = ${m.getByOffset("global_idx")};
    let value = (x - inputMean) * inverseSqrt(inputVar + epsilon) * scale + bias;
    ${C.setByOffset("global_idx","value")}
  }`;return{name:"BatchNormalization",shaderCache:{hint:`${t.epsilon}_${t.format}_${a}_${o}`,inputDependencies:d?["rank","type","type","type","type"]:void 0},getShaderSource:$,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:d?[{type:12,data:p},...Q(r)]:[{type:12,data:p}]})}},So=e=>fe(e),up=(e,t)=>{let{inputs:i,outputCount:a}=e,n=So({...t,outputCount:a});if(be.webgpu.validateInputContent&&To(i,n),t.trainingMode)throw new Error("BatchNormalization trainingMode is not supported yet.");e.compute(ko(i,n))}}),Io,Eo,lp,Rm=q(()=>{ne(),oe(),Io=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![320,640,1280].includes(e[0].dims[2]))throw new Error("number of channels should be 320, 640 or 1280");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},Eo=e=>{let t=e[0].dims,i=e[0].dims[2],a=O.size(t)/4,n=e[0].dataType,r=N("input",n,t,4),o=N("bias",n,[i],4),u=N("residual",n,t,4),p=K("output",n,t,4);return{name:"BiasAdd",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(a/64)}}),getShaderSource:d=>`
  const channels = ${i}u / 4;
  ${d.declareVariables(r,o,u,p)}

  ${d.mainStart()}
    ${d.guardAgainstOutOfBoundsWorkgroupSizes(a)}
    let value = ${r.getByOffset("global_idx")}
      + ${o.getByOffset("global_idx % channels")} + ${u.getByOffset("global_idx")};
    ${p.setByOffset("global_idx","value")}
  }`}},lp=e=>{Io(e.inputs),e.compute(Eo(e.inputs))}}),zo,pe,dp,pp,cp,fp,hp,mp,gp,_p,yp,Ao,bp,wp,$p,vp,li,xp,Pi,Cp,Tp,kp,Sp,Ip,Ep,zp,Ap,Op,Rp,Bp,Np,Dp,Mp,Pp,Up,qr,qp,va,xa,Wp,Lp,Vp,Oo,Ro,jp,Ha=q(()=>{re(),ne(),xe(),oe(),zo=(e,t,i,a,n,r,o)=>{let u=Math.ceil(t/4),p="";typeof n=="string"?p=`${n}(a)`:p=n("a");let d=N("inputData",i,[u],4),f=K("outputData",a,[u],4),m=[{name:"vec_size",type:"u32"}];return o&&m.push(...o),`
      ${e.registerUniforms(m).declareVariables(d,f)}

  ${r??""}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}

    let a = ${d.getByOffset("global_idx")};
    ${f.setByOffset("global_idx",p)}
  }`},pe=(e,t,i,a,n,r=e.dataType,o,u)=>{let p=[{type:12,data:Math.ceil(O.size(e.dims)/4)}];return o&&p.push(...o),{name:t,shaderCache:{hint:n,inputDependencies:["type"]},getShaderSource:d=>zo(d,O.size(e.dims),e.dataType,r,i,a,u),getRunData:d=>({outputs:[{dims:e.dims,dataType:r}],dispatchGroup:{x:Math.ceil(O.size(d[0].dims)/64/4)},programUniforms:p})}},dp=e=>{e.compute(pe(e.inputs[0],"Abs","abs"))},pp=e=>{e.compute(pe(e.inputs[0],"Acos","acos"))},cp=e=>{e.compute(pe(e.inputs[0],"Acosh","acosh"))},fp=e=>{e.compute(pe(e.inputs[0],"Asin","asin"))},hp=e=>{e.compute(pe(e.inputs[0],"Asinh","asinh"))},mp=e=>{e.compute(pe(e.inputs[0],"Atan","atan"))},gp=e=>{e.compute(pe(e.inputs[0],"Atanh","atanh"))},_p=e=>fe(e),yp=(e,t)=>{let i;switch(t.to){case 10:i="vec4<f16>";break;case 1:i="vec4<f32>";break;case 12:i="vec4<u32>";break;case 6:i="vec4<i32>";break;case 9:i="vec4<bool>";break;default:throw new RangeError(`not supported type (specified in attribute 'to' from 'Cast' operator): ${t.to}`)}e.compute(pe(e.inputs[0],"Cast",i,void 0,t.cacheKey,t.to))},Ao=e=>{let t,i,a=e.length>=2&&e[1].data!==0,n=e.length>=3&&e[2].data!==0;switch(e[0].dataType){case 1:t=a?e[1].getFloat32Array()[0]:-34028234663852886e22,i=n?e[2].getFloat32Array()[0]:34028234663852886e22;break;case 10:t=a?e[1].getUint16Array()[0]:64511,i=n?e[2].getUint16Array()[0]:31743;break;default:throw new Error("Unsupport data type")}return fe({min:t,max:i})},bp=(e,t)=>{let i=t||Ao(e.inputs),a=ze(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"Clip",n=>`clamp(${n}, vec4<${a}>(uniforms.min), vec4<${a}>(uniforms.max))`,void 0,i.cacheKey,void 0,[{type:e.inputs[0].dataType,data:i.min},{type:e.inputs[0].dataType,data:i.max}],[{name:"min",type:a},{name:"max",type:a}]),{inputs:[0]})},wp=e=>{e.compute(pe(e.inputs[0],"Ceil","ceil"))},$p=e=>{e.compute(pe(e.inputs[0],"Cos","cos"))},vp=e=>{e.compute(pe(e.inputs[0],"Cosh","cosh"))},li=e=>fe(e),xp=(e,t)=>{let i=ze(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"Elu",a=>`elu_vf32(${a})`,`
  const elu_alpha_ = ${i}(${t.alpha});

  fn elu_f32(a: ${i}) -> ${i} {
  return select((exp(a) - 1.0) * elu_alpha_, a, a >= 0.0);
  }

  fn elu_vf32(v: vec4<${i}>) -> vec4<${i}> {
  return vec4(elu_f32(v.x), elu_f32(v.y), elu_f32(v.z), elu_f32(v.w));
  }`,t.cacheKey))},Pi=(e="f32")=>`
const r0: ${e} = 0.3275911;
const r1: ${e} = 0.254829592;
const r2: ${e} = -0.284496736;
const r3: ${e} = 1.421413741;
const r4: ${e} = -1.453152027;
const r5: ${e} = 1.061405429;

fn erf_vf32(v: vec4<${e}>) -> vec4<${e}> {
  let absv = abs(v);
  let x = 1.0 / (1.0 + r0 * absv);
  return sign(v) * (1.0 - ((((r5 * x + r4) * x + r3) * x + r2) * x + r1) * x * exp(-absv * absv));
}`,Cp=e=>{let t=ze(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"Erf",i=>`erf_vf32(${i})`,Pi(t)))},Tp=e=>{e.compute(pe(e.inputs[0],"Exp","exp"))},kp=e=>{e.compute(pe(e.inputs[0],"Floor","floor"))},Sp=e=>{let t=ze(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"Gelu",i=>`0.5 * ${i} * (1.0 + erf_vf32(${i} * 0.7071067811865475))`,Pi(t)))},Ip=(e,t)=>{let i=ze(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"LeakyRelu",a=>`select(leaky_relu_alpha_ * ${a}, ${a}, ${a} >= vec4<${i}>(0.0))`,`const leaky_relu_alpha_ = ${i}(${t.alpha});`,t.cacheKey))},Ep=e=>{e.compute(pe(e.inputs[0],"Not",t=>`!${t}`))},zp=e=>{e.compute(pe(e.inputs[0],"Neg",t=>`-${t}`))},Ap=e=>{e.compute(pe(e.inputs[0],"Reciprocal",t=>`1.0/${t}`))},Op=e=>{let t=ze(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"Relu",i=>`select(vec4<${t}>(0.0), ${i}, ${i} > vec4<${t}>(0.0))`))},Rp=e=>{e.compute(pe(e.inputs[0],"Sigmoid",t=>`(1.0 / (1.0 + exp(-${t})))`))},Bp=e=>fe(e),Np=(e,t)=>{let i=ze(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"HardSigmoid",a=>`max(vec4<${i}>(0.0), min(vec4<${i}>(1.0), ${t.alpha} * ${a} + vec4<${i}>(${t.beta})))`,void 0,t.cacheKey))},Dp=e=>{e.compute(pe(e.inputs[0],"Sin","sin"))},Mp=e=>{e.compute(pe(e.inputs[0],"Sinh","sinh"))},Pp=e=>{e.compute(pe(e.inputs[0],"Sqrt","sqrt"))},Up=e=>{e.compute(pe(e.inputs[0],"Tan","tan"))},qr=e=>`sign(${e}) * (1 - exp(-2 * abs(${e}))) / (1 + exp(-2 * abs(${e})))`,qp=e=>{e.compute(pe(e.inputs[0],"Tanh",qr))},va=(e="f32")=>`
const fast_gelu_a: ${e} = 0.5;
const fast_gelu_b: ${e} = 0.7978845608028654;
const fast_gelu_c: ${e} = 0.035677408136300125;

fn tanh_v(v: vec4<${e}>) -> vec4<${e}> {
  return ${qr("v")};
}
`,xa=e=>`(fast_gelu_a + fast_gelu_a * tanh_v(${e} * (fast_gelu_c * ${e} * ${e} + fast_gelu_b))) * ${e}`,Wp=e=>{let t=ze(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"FastGelu",xa,va(t),void 0,e.inputs[0].dataType))},Lp=(e,t)=>{let i=ze(e.inputs[0].dataType);return e.compute(pe(e.inputs[0],"ThresholdedRelu",a=>`select(vec4<${i}>(0.0), ${a}, ${a} > thresholded_relu_alpha_)`,`const thresholded_relu_alpha_ = vec4<${i}>(${t.alpha});`,t.cacheKey)),0},Vp=e=>{e.compute(pe(e.inputs[0],"Log","log"))},Oo=(e,t)=>`
const alpha = vec4<${e}>(${t});
const one = ${e}(1.0);
const zero = ${e}(0.0);

fn quick_gelu_impl(x: vec4<${e}>) -> vec4<${e}> {
  let v = x *alpha;
  var x1 : vec4<${e}>;
  for (var i = 0; i < 4; i = i + 1) {
    if (v[i] >= zero) {
      x1[i] = one / (one + exp(-v[i]));
    } else {
      x1[i] = one - one / (one + exp(v[i]));
    }
  }
  return x * x1;
}
`,Ro=e=>`quick_gelu_impl(${e})`,jp=(e,t)=>{let i=ze(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"QuickGelu",Ro,Oo(i,t.alpha),t.cacheKey,e.inputs[0].dataType))}}),Bo,No,Gp,Bm=q(()=>{ne(),oe(),Ha(),Bo=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![2560,5120,10240].includes(e[0].dims[2]))throw new Error("hidden state should be 2560, 5120 or 10240");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},No=e=>{let t=e[0].dims.slice();t[2]=t[2]/2;let i=N("input",e[0].dataType,e[0].dims,4),a=N("bias",e[0].dataType,[e[0].dims[2]],4),n=K("output",e[0].dataType,t,4),r=O.size(t)/4,o=Se(e[0].dataType);return{name:"BiasSplitGelu",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(r/64)}}),getShaderSource:u=>`
  const M_SQRT2 = sqrt(2.0);
  const halfChannels = ${e[0].dims[2]/4/2}u;

  ${u.declareVariables(i,a,n)}

  ${Pi(o)}

  ${u.mainStart()}
    ${u.guardAgainstOutOfBoundsWorkgroupSizes(r)}
    let biasIdx = global_idx % halfChannels;
    let batchIndex = global_idx / halfChannels;
    let inputOffset = biasIdx + batchIndex * halfChannels * 2;
    let valueLeft = input[inputOffset] + bias[biasIdx];
    let valueRight = input[inputOffset + halfChannels] + bias[biasIdx + halfChannels];
    let geluRight = valueRight * 0.5 * (erf_vf32(valueRight / M_SQRT2) + 1);

    ${n.setByOffset("global_idx","valueLeft * geluRight")}
  }`}},Gp=e=>{Bo(e.inputs),e.compute(No(e.inputs))}}),Do,Mo,Fe,Hp,Fp,Kp,Zp,Yp,Xp,Qp,Jp,ec,tc,Nm=q(()=>{re(),ne(),oe(),Do=(e,t,i,a,n,r,o,u,p,d,f,m)=>{let g,_;typeof u=="string"?g=_=($,T)=>`${u}((${$}),(${T}))`:typeof u=="function"?g=_=u:(g=u.scalar,_=u.vector);let b=K("outputData",f,a.length,4),w=N("aData",p,t.length,4),C=N("bData",d,i.length,4),v;if(n)if(r){let $=O.size(t)===1,T=O.size(i)===1,k=t.length>0&&t[t.length-1]%4===0,S=i.length>0&&i[i.length-1]%4===0;$||T?v=b.setByOffset("global_idx",_($?`${w.type.value}(${w.getByOffset("0")}.x)`:w.getByOffset("global_idx"),T?`${C.type.value}(${C.getByOffset("0")}.x)`:C.getByOffset("global_idx"))):v=`
            let outputIndices = ${b.offsetToIndices("global_idx * 4u")};
            let offsetA = ${w.broadcastedIndicesToOffset("outputIndices",b)};
            let offsetB = ${C.broadcastedIndicesToOffset("outputIndices",b)};
            ${b.setByOffset("global_idx",_(o||k?w.getByOffset("offsetA / 4u"):`${w.type.value}(${w.getByOffset("offsetA / 4u")}[offsetA % 4u])`,o||S?C.getByOffset("offsetB / 4u"):`${C.type.value}(${C.getByOffset("offsetB / 4u")}[offsetB % 4u])`))}
          `}else v=b.setByOffset("global_idx",_(w.getByOffset("global_idx"),C.getByOffset("global_idx")));else{if(!r)throw new Error("no necessary to use scalar implementation for element-wise binary op implementation.");let $=(T,k,S="")=>{let E=`aData[indexA${k}][componentA${k}]`,z=`bData[indexB${k}][componentB${k}]`;return`
            let outputIndices${k} = ${b.offsetToIndices(`global_idx * 4u + ${k}u`)};
            let offsetA${k} = ${w.broadcastedIndicesToOffset(`outputIndices${k}`,b)};
            let offsetB${k} = ${C.broadcastedIndicesToOffset(`outputIndices${k}`,b)};
            let indexA${k} = offsetA${k} / 4u;
            let indexB${k} = offsetB${k} / 4u;
            let componentA${k} = offsetA${k} % 4u;
            let componentB${k} = offsetB${k} % 4u;
            ${T}[${k}] = ${S}(${g(E,z)});
          `};f===9?v=`
            var data = vec4<u32>(0);
            ${$("data",0,"u32")}
            ${$("data",1,"u32")}
            ${$("data",2,"u32")}
            ${$("data",3,"u32")}
            outputData[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:v=`
            ${$("outputData[global_idx]",0)}
            ${$("outputData[global_idx]",1)}
            ${$("outputData[global_idx]",2)}
            ${$("outputData[global_idx]",3)}
          `}return`
        ${e.registerUniform("vec_size","u32").declareVariables(w,C,b)}

        ${m??""}

        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${v}
      }`},Mo=(e,t,i,a,n,r,o=i.dataType)=>{let u=i.dims.map(w=>Number(w)??1),p=a.dims.map(w=>Number(w)??1),d=!O.areEqual(u,p),f=u,m=O.size(u),g=!1,_=!1,b=[d];if(d){let w=Vt.calcShape(u,p,!1);if(!w)throw new Error("Can't perform binary op on the given tensors");f=w.slice(),m=O.size(f);let C=O.size(u)===1,v=O.size(p)===1,$=u.length>0&&u[u.length-1]%4===0,T=p.length>0&&p[p.length-1]%4===0;b.push(C),b.push(v),b.push($),b.push(T);let k=1;for(let S=1;S<f.length;S++){let E=u[u.length-S],z=p[p.length-S];if(E===z)k*=E;else break}k%4===0?(_=!0,g=!0):(C||v||$||T)&&(g=!0)}else g=!0;return b.push(g),{name:e,shaderCache:{hint:t+b.map(w=>w.toString()).join("_"),inputDependencies:["rank","rank"]},getShaderSource:w=>Do(w,u,p,f,g,d,_,n,i.dataType,a.dataType,o,r),getRunData:()=>({outputs:[{dims:f,dataType:o}],dispatchGroup:{x:Math.ceil(m/64/4)},programUniforms:[{type:12,data:Math.ceil(O.size(f)/4)},...Q(u,p,f)]})}},Fe=(e,t,i,a,n,r)=>{e.compute(Mo(t,n??"",e.inputs[0],e.inputs[1],i,a,r))},Hp=e=>{Fe(e,"Add",(t,i)=>`${t}+${i}`)},Fp=e=>{Fe(e,"Div",(t,i)=>`${t}/${i}`)},Kp=e=>{Fe(e,"Equal",{scalar:(t,i)=>`u32(${t}==${i})`,vector:(t,i)=>`vec4<u32>(${t}==${i})`},void 0,void 0,9)},Zp=e=>{Fe(e,"Mul",(t,i)=>`${t}*${i}`)},Yp=e=>{let t=N("input",e.inputs[0].dataType,e.inputs[0].dims).type.value;Fe(e,"Pow",{scalar:(i,a)=>`pow_custom(${i},${a})`,vector:(i,a)=>`pow_vector_custom(${i},${a})`},`
    fn pow_custom(a : ${t}, b : ${t}) -> ${t} {
      if (b == ${t}(0.0)) {
        return ${t}(1.0);
      } else if (a < ${t}(0.0) && f32(b) != floor(f32(b))) {
        return ${t}(pow(f32(a), f32(b))); // NaN
      }
      return select(sign(a), ${t}(1.0), round(f32(abs(b) % ${t}(2.0))) != 1.0) * ${t}(${t==="i32"?"round":""}(pow(f32(abs(a)), f32(b))));
    }
    fn pow_vector_custom(a : vec4<${t}>, b : vec4<${t}>) -> vec4<${t}> {
      // TODO: implement vectorized pow
      return vec4<${t}>(pow_custom(a.x, b.x), pow_custom(a.y, b.y), pow_custom(a.z, b.z), pow_custom(a.w, b.w));
    }
      `)},Xp=e=>{Fe(e,"Sub",(t,i)=>`${t}-${i}`)},Qp=e=>{Fe(e,"Greater",{scalar:(t,i)=>`u32(${t}>${i})`,vector:(t,i)=>`vec4<u32>(${t}>${i})`},void 0,void 0,9)},Jp=e=>{Fe(e,"Less",{scalar:(t,i)=>`u32(${t}<${i})`,vector:(t,i)=>`vec4<u32>(${t}<${i})`},void 0,void 0,9)},ec=e=>{Fe(e,"GreaterOrEqual",{scalar:(t,i)=>`u32(${t}>=${i})`,vector:(t,i)=>`vec4<u32>(${t}>=${i})`},void 0,void 0,9)},tc=e=>{Fe(e,"LessOrEqual",{scalar:(t,i)=>`u32(${t}<=${i})`,vector:(t,i)=>`vec4<u32>(${t}<=${i})`},void 0,void 0,9)}}),Po,Uo,qo,Wo,ic,rc,Dm=q(()=>{re(),ne(),xe(),oe(),Po=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");let i=0,a=e[i],n=a.dataType,r=a.dims.length;e.forEach((o,u)=>{if(u!==i){if(o.dataType!==n)throw new Error("input tensors should be one type");if(o.dims.length!==r)throw new Error("input tensors should have the same shape");o.dims.forEach((p,d)=>{if(d!==t&&p!==a.dims[d])throw new Error("non concat dimensions must match")})}})},Uo=(e,t)=>`
  fn calculateInputIndex(index: u32) -> u32 {
    let sizeInConcatAxis = array<u32, ${e}u>(${t});
    for (var i: u32 = 0u; i < ${e}; i += 1u ) {
      if (index < sizeInConcatAxis[i]) {
        return i;
      }
    }
    return ${e}u;
  }`,qo=(e,t)=>{let i=e.length,a=[];for(let n=0;n<i;++n){let r=t.setByOffset("global_idx",e[n].getByIndices("indices"));i===1?a.push(r):n===0?a.push(`if (inputIndex == ${n}u) { ${r} }`):n===i-1?a.push(`else { ${r} }`):a.push(`else if (inputIndex == ${n}) { ${r} }`)}return a.join(`
`)},Wo=(e,t,i,a)=>{let n=O.size(i),r=new Array(e.length),o=new Array(e.length),u=0,p=[],d=[],f=[{type:12,data:n}];for(let w=0;w<e.length;++w)u+=e[w].dims[t],r[w]=u,d.push(e[w].dims.length),o[w]=N(`input${w}`,a,d[w]),p.push("rank"),f.push({type:12,data:r[w]});for(let w=0;w<e.length;++w)f.push(...Q(e[w].dims));f.push(...Q(i));let m=K("output",a,i.length),g=m.indicesGet("indices",t),_=Array.from(Array(r.length).keys()).map(w=>`uniforms.sizeInConcatAxis${w}`).join(","),b=w=>`

  ${(()=>{w.registerUniform("outputSize","u32");for(let C=0;C<e.length;C++)w.registerUniform(`sizeInConcatAxis${C}`,"u32");return w.declareVariables(...o,m)})()}

  ${Uo(r.length,_)}

  ${w.mainStart()}
    ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

    var indices = ${m.offsetToIndices("global_idx")};

    let inputIndex = calculateInputIndex(${g});
    if (inputIndex != 0u) {
      let sizeInConcatAxis = array<u32, ${r.length}u>(${_});
      ${g} -= sizeInConcatAxis[inputIndex - 1u];
    }

    ${qo(o,m)}
  }`;return{name:"Concat",shaderCache:{hint:`${t}`,inputDependencies:p},getRunData:()=>({outputs:[{dims:i,dataType:a}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:f}),getShaderSource:b}},ic=(e,t)=>{let i=e.inputs,a=i[0].dims,n=O.normalizeAxis(t.axis,a.length);Po(i,n);let r=a.slice();r[n]=i.reduce((u,p)=>u+(p.dims.length>n?p.dims[n]:0),0);let o=i.filter(u=>O.size(u.dims)>0);e.compute(Wo(o,n,r,i[0].dataType),{inputs:o})},rc=e=>fe({axis:e.axis})}),Bt,Nt,Dt,Fa,Pt=q(()=>{re(),ne(),Bt=(e,t,i="f32")=>{switch(e.activation){case"Relu":return`value = max(value, ${t}(0.0));`;case"Sigmoid":return`value = (${t}(1.0) / (${t}(1.0) + exp(-value)));`;case"Clip":return`value = clamp(value, ${t}(${i}(uniforms.clip_min)), ${t}(${i}(uniforms.clip_max)));`;case"HardSigmoid":return`value = max(${t}(0.0), min(${t}(1.0), ${i}(uniforms.alpha) * value + ${i}(uniforms.beta)));`;case"LeakyRelu":return`value = select(${i}(uniforms.alpha) * value, value, value >= ${t}(0.0));`;case"Tanh":return`let e2x = exp(-2.0 * abs(value));
              value = sign(value) * (1.0 - e2x) / (1.0 + e2x);
        `;case"":return"";default:throw new Error(`Unsupported activation ${e.activation}`)}},Nt=(e,t)=>{e.activation==="Clip"?t.push({type:1,data:e.clipMax},{type:1,data:e.clipMin}):e.activation==="HardSigmoid"?t.push({type:1,data:e.alpha},{type:1,data:e.beta}):e.activation==="LeakyRelu"&&t.push({type:1,data:e.alpha})},Dt=(e,t)=>{e.activation==="Clip"?t.push({name:"clip_max",type:"f32"},{name:"clip_min",type:"f32"}):e.activation==="HardSigmoid"?t.push({name:"alpha",type:"f32"},{name:"beta",type:"f32"}):e.activation==="LeakyRelu"&&t.push({name:"alpha",type:"f32"})},Fa=e=>{let t=(e==null?void 0:e.activation)||"";if(t==="HardSigmoid"){let[i,a]=(e==null?void 0:e.activation_params)||[.2,.5];return{activation:t,alpha:i,beta:a}}else if(t==="Clip"){let[i,a]=(e==null?void 0:e.activation_params)||[Ed,zd];return{activation:t,clipMax:a,clipMin:i}}else if(t==="LeakyRelu"){let[i]=(e==null?void 0:e.activation_params)||[.01];return{activation:t,alpha:i}}return{activation:t}}}),Ee,ac,Ka=q(()=>{Ee=(e,t)=>{switch(e){case 1:return t;case 2:return`vec2<${t}>`;case 3:return`vec3<${t}>`;case 4:return`vec4<${t}>`;default:throw new Error(`${e}-component is not supported.`)}},ac=e=>`
      ${e?"value = value + getBiasByOutputCoords(coords);":""}
      `}),nc,Mm=q(()=>{nc=e=>`
fn getIndexFromCoords4D(coords : vec4<i32>, shape : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
      shape.y * shape.z * shape.w, shape.z * shape.w, shape.w, 1));
}
fn getOutputIndexFromCoords(coords : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
    i32(${e}.x), i32(${e}.y), i32(${e}.z), 1));
}
`}),pi,Za,Ya=q(()=>{re(),ne(),oe(),Pt(),pi=(e,t,i,a,n)=>{let r=a-i;return`
      ${Array.from({length:i}).map((o,u)=>`
      if (${X(t.shape,u,t.rank)} != 1) {
        ${t.indicesSet(e,u,X(n,u+r,a))}
      } else {
        ${t.indicesSet(e,u,0)}
      }`).join("")}
`},Za=(e,t,i,a,n=!1,r)=>{let o=e[0].dims,u=e[1].dims,p=o[o.length-2],d=u[u.length-1],f=o[o.length-1],m=ve(d),g=ve(f),_=ve(p),b=O.size(i)/m/_,w=e.length>2,C=a?a.slice(0,-2):i.slice(0,-2),v=[O.size(C),p,d],$=[{type:12,data:b},{type:12,data:p},{type:12,data:d},{type:12,data:f}];Nt(t,$),$.push(...Q(C,o,u)),w&&$.push(...Q(e[2].dims)),$.push(...Q(v));let T=k=>{let S=Va("batch_dims",e[0].dataType,C.length),E=N("a",e[0].dataType,o.length,g),z=N("b",e[1].dataType,u.length,m),R=K("output",e[0].dataType,v.length,m),M=Se(R.type.tensor),L=Bt(t,R.type.value,M),J=[E,z],H="";if(w){let ae=n?m:1;J.push(N("bias",e[2].dataType,e[2].dims.length,ae)),H=`${n?`value += bias[col / ${ae}];`:`value += ${R.type.value}(bias[row + i]);`}`}let j=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"}];Dt(t,j);let le=()=>{let ae=`var a_data: ${E.type.value};`;for(let Z=0;Z<g;Z++)ae+=`
              let b_data${Z} = b[(b_offset + (k + ${Z}) * uniforms.N + col) / ${m}];`;for(let Z=0;Z<_;Z++){ae+=`a_data = a[(a_offset + (row + ${Z}) * uniforms.K + k) / ${g}];`;for(let se=0;se<g;se++)ae+=`
            values[${Z}] = fma(${z.type.value}(a_data${g===1?"":`[${se}]`}), b_data${se}, values[${Z}]);
`}return ae};return`
  ${k.registerUniforms(j).registerInternalVariables(S).declareVariables(...J,R)}
  ${k.mainStart()}
    ${k.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let col = (global_idx % (uniforms.N / ${m})) * ${m};
    var index1 = global_idx / (uniforms.N / ${m});
    let stride1 = uniforms.M / ${_};
    let row = (index1 % stride1) * ${_};
    let batch = index1 / stride1;

    ${i.length===2?"":`let batch_indices = ${S.offsetToIndices("batch")};`}

    var a_indices: ${E.type.indices};
    ${pi("a_indices",E,E.rank-2,S.rank,"batch_indices")}
    ${E.indicesSet("a_indices",E.rank-2,0)}
    ${E.indicesSet("a_indices",E.rank-1,0)}
    let a_offset = ${E.indicesToOffset("a_indices")};

    var b_indices: ${z.type.indices};
    ${pi("b_indices",z,z.rank-2,S.rank,"batch_indices")}
    ${z.indicesSet("b_indices",z.rank-2,0)}
    ${z.indicesSet("b_indices",z.rank-1,0)}
    let b_offset = ${z.indicesToOffset("b_indices")};
    var values: array<${R.type.value}, ${_}>;
    for (var k: u32 = 0u; k < uniforms.K; k = k + ${g}) {
      ${le()}
    }
    for (var i = 0u; i < ${_}u; i++) {
      var value = values[i];
      ${H}
      ${L}
      let cur_indices = ${R.type.indices}(batch, row + i, col);
      let offset = ${R.indicesToOffset("cur_indices")};
      ${R.setByOffset(`offset / ${m}`,"value")};
    }
  }
  `};return{name:"MatMulNaive",shaderCache:{hint:`${t.activation};${m};${g};${_};${n}`,inputDependencies:w?["rank","rank","rank"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:r?r(i):i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(b/64)},programUniforms:$}),getShaderSource:T}}}),Lo,Vo,Ca,Wr,jo,Ta,Go,ji,Xa=q(()=>{re(),ne(),oe(),Pt(),Ya(),Ka(),Lo=(e,t)=>e?`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          kStart + inputRow,
          globalRowStart / innerElementSize + inputCol${t?", batchIndices":""});
        `:`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          globalRow + innerRow,
          kStart / innerElementSize + inputCol${t?", batchIndices":""});
        `,Vo=(e,t)=>e?`
        let ACached0 = mm_Asub[k * innerElementSize][localRow];
        let ACached1 = mm_Asub[k * innerElementSize + 1][localRow];
        let ACached2 = mm_Asub[k * innerElementSize + 2][localRow];
        ${t===3?"":"let ACached3 = mm_Asub[k * innerElementSize + 3][localRow];"}
        for (var i = 0; i < rowPerThread; i = i + 1) {
          acc[i] = BCached0 * ACached0[i] + acc[i];
          acc[i] = BCached1 * ACached1[i] + acc[i];
          acc[i] = BCached2 * ACached2[i] + acc[i];
          ${t===3?"":"acc[i] = BCached3 * ACached3[i] + acc[i];"}
        }`:`
        for (var i = 0; i < rowPerThread; i = i + 1) {
          let ACached = mm_Asub[tileRow + i][k];
          acc[i] = BCached0 * ACached.x + acc[i];
          acc[i] = BCached1 * ACached.y + acc[i];
          acc[i] = BCached2 * ACached.z + acc[i];
          ${t===3?"":"acc[i] = BCached3 * ACached.w + acc[i];"}
        }`,Ca=(e,t,i="f32",a,n=!1,r=32,o=!1,u=32)=>{let p=t[1]*e[1],d=t[0]*e[0],f=n?p:r,m=n?r:p,g=f/t[0],_=r/t[1];if(!((n&&g===4&&e[1]===4||!n&&(g===3||g===4))&&f%t[0]===0&&r%t[1]===0&&e[0]===4))throw new Error(`If transposeA ${n} is true, innerElementSize ${g} and workPerThread[1] ${e[1]} must be 4.
      Otherwise, innerElementSize ${g} must be 3 or 4.
  tileAWidth ${f} must be divisible by workgroupSize[0]${t[0]}. tileInner ${r} must be divisible by workgroupSize[1] ${t[1]}. colPerThread ${e[0]} must be 4.`);return`
var<workgroup> mm_Asub: array<array<vec${g}<${i}>, ${f/g}>, ${m}>;
var<workgroup> mm_Bsub: array<array<vec4<${i}>, ${d/e[0]}>, ${r}>;

const rowPerThread = ${e[1]};
const colPerThread = ${e[0]};
const innerElementSize = ${g};
const tileInner = ${r};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
  let localRow = i32(localId.y);
  let tileRow = localRow * rowPerThread;
  let tileCol = i32(localId.x);

  let globalRow =i32(globalId.y) * rowPerThread;
  let globalCol = i32(globalId.x);
  let batch = ${o?"0":"i32(globalId.z)"};
  ${a?`let batchIndices = ${a.offsetToIndices("u32(batch)")};`:""}
  let globalRowStart = i32(workgroupId.y) * ${p};

  let num_tiles = ${o?`${Math.ceil(u/r)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
  var kStart = ${o?`i32(globalId.z) * ${u}`:"0"};

  var acc: array<vec4<${i}>, rowPerThread>;

  // Loop over shared dimension.
  let tileRowB = localRow * ${_};
  for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let inputRow = tileRow + innerRow;
          let inputCol = tileCol;
          ${Lo(n,a)}
      }

      // Load one tile of B into local memory.
      for (var innerRow = 0; innerRow < ${_}; innerRow = innerRow + 1) {
          let inputRow = tileRowB + innerRow;
          let inputCol = tileCol;
          mm_Bsub[inputRow][inputCol] = mm_readB(batch, kStart + inputRow, globalCol${a?", batchIndices":""});
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      for (var k = 0; k < tileInner / innerElementSize; k = k + 1) {
          let BCached0 = mm_Bsub[k * innerElementSize][tileCol];
          let BCached1 = mm_Bsub[k * innerElementSize + 1][tileCol];
          let BCached2 = mm_Bsub[k * innerElementSize + 2][tileCol];
          ${g===3?"":"let BCached3 = mm_Bsub[k * innerElementSize + 3][tileCol];"}

          ${Vo(n,g)}
      }

      workgroupBarrier();
  }

  for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      mm_write(batch, globalRow + innerRow, globalCol, acc[innerRow]);
  }
}`},Wr=(e,t)=>e?`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              kStart + inputRow,
              globalRowStart + inputCol${t?", batchIndices":""});
            `:`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              globalRowStart + inputRow,
              kStart + inputCol${t?", batchIndices":""});
            `,jo=e=>e?"let ACached = mm_Asub[k][tileRow + innerRow];":"let ACached = mm_Asub[tileRow + innerRow][k];",Ta=(e,t,i="f32",a,n=!1,r=32,o=!1,u=32,p=!1)=>{let d=e[1]*t[1],f=e[0]*t[0],m=n?d:r,g=n?r:d;if(!(g%t[1]===0&&m%t[0]===0&&r%t[1]===0))throw new Error(`tileAHight ${g} must be divisible by workgroupSize[1]${t[1]}, tileAWidth ${m} must be divisible by workgroupSize[0]${t[0]}, tileInner ${r} must be divisible by workgroupSize[1]${t[1]}`);let _=g/t[1],b=m/t[0],w=r/t[1],C=p?`
    let localRow = i32(localId.y);
    let localCol = i32(localId.x);
    let globalRowStart = i32(workgroupId.y) * ${d};
    let globalColStart = i32(workgroupId.x) * ${f};

    // Loop over shared dimension.
    for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var inputRow = localRow; inputRow < ${g}; inputRow = inputRow + ${t[1]}) {
        for (var inputCol = localCol; inputCol < ${m}; inputCol = inputCol + ${t[0]}) {
          ${Wr(n,a)}
        }
      }
      // Load one tile of B into local memory.
      for (var inputRow = localRow; inputRow < ${r}; inputRow = inputRow + ${t[1]}) {
            for (var inputCol = localCol; inputCol < ${f}; inputCol = inputCol + ${t[0]}) {
          mm_Bsub[inputRow][inputCol] = mm_readB(batch,
            kStart + inputRow,
            globalColStart + inputCol${a?", batchIndices":""});
        }
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      var BCached : array<${i}, colPerThread>;
      for (var k = 0; k < tileInner; k = k + 1) {
        for (var inner = 0; inner < colPerThread; inner = inner + 1) {
          BCached[inner] = mm_Bsub[k][localCol + inner * ${t[0]}];
        }
        for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let ACached = ${n?`mm_Asub[k][localRow + innerRow * ${t[1]}];`:`mm_Asub[localRow + innerRow * ${t[1]}][k];`}
          for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
            acc[innerRow][innerCol] = acc[innerRow][innerCol] +
                ACached * BCached[innerCol];
          }
        }
      }
      workgroupBarrier();
    }
    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      let gRow = globalRowStart + localRow + innerRow * ${t[1]};
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        let gCol = globalColStart + localCol + innerCol * ${t[0]};
        mm_write(batch, gRow, gCol, acc[innerRow][innerCol]);
      }
    }
    `:`
let tileRow = i32(localId.y) * rowPerThread;
let tileCol = i32(localId.x) * colPerThread;

let globalRow = i32(globalId.y) * rowPerThread;
let globalCol = i32(globalId.x) * colPerThread;
let globalRowStart = i32(workgroupId.y) * ${d};

let tileRowA = i32(localId.y) * ${_};
let tileColA = i32(localId.x) * ${b};
let tileRowB = i32(localId.y) * ${w};
// Loop over shared dimension.
for (var t = 0; t < num_tiles; t = t + 1) {
  // Load one tile of A into local memory.
  for (var innerRow = 0; innerRow < ${_}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < ${b}; innerCol = innerCol + 1) {
      let inputRow = tileRowA + innerRow;
      let inputCol = tileColA + innerCol;
      ${Wr(n,a)}
    }
  }

  // Load one tile of B into local memory.
  for (var innerRow = 0; innerRow < ${w}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
      let inputRow = tileRowB + innerRow;
      let inputCol = tileCol + innerCol;
      mm_Bsub[inputRow][inputCol] = mm_readB(batch,
        kStart + inputRow,
        globalCol + innerCol${a?", batchIndices":""});
    }
  }
  kStart = kStart + tileInner;
  workgroupBarrier();

  // Compute acc values for a single thread.
  var BCached : array<${i}, colPerThread>;
  for (var k = 0; k < tileInner; k = k + 1) {
    for (var inner = 0; inner < colPerThread; inner = inner + 1) {
      BCached[inner] = mm_Bsub[k][tileCol + inner];
    }

    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      ${jo(n)}
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        acc[innerRow][innerCol] = acc[innerRow][innerCol] + ACached * BCached[innerCol];
      }
    }
  }

  workgroupBarrier();
}

for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
  for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
    mm_write(batch, globalRow + innerRow, globalCol + innerCol,
        acc[innerRow][innerCol]);
  }
}
`;return`
  var<workgroup> mm_Asub : array<array<${i}, ${m}>, ${g}>;
  var<workgroup> mm_Bsub : array<array<${i}, ${f}>, ${r}>;
  const rowPerThread = ${e[1]};
  const colPerThread = ${e[0]};
  const tileInner = ${r};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
    let batch = ${o?"0":"i32(globalId.z)"};
    ${a?`let batchIndices = ${a.offsetToIndices("u32(batch)")};`:""}
    let num_tiles = ${o?`${Math.ceil(u/r)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
    var kStart = ${o?`i32(globalId.z) * ${u}`:"0"};

    var acc : array<array<${i}, colPerThread>, rowPerThread>;
    ${C}
  }
`},Go=(e,t,i,a,n=!1)=>{let[r,o,u,p]=a,d=Se(a[0].type.tensor);return`
    fn mm_readA(batch: i32, row: i32, colIn: i32, batchIndices: ${r.type.indices}) -> ${Ee(e,d)} {
      var value = ${Ee(e,d)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_a_outer && col < uniforms.dim_inner)
      {
        var aIndices: ${o.type.indices};
        ${pi("aIndices",o,o.rank-2,r.rank,"batchIndices")}
        ${o.indicesSet("aIndices",o.rank-2,"u32(row)")}
        ${o.indicesSet("aIndices",o.rank-1,"u32(colIn)")}
        value = ${o.getByIndices("aIndices")};
      }
      return value;
    }

    fn mm_readB(batch: i32, row: i32, colIn: i32, batchIndices: ${r.type.indices}) -> ${Ee(e,d)} {
      var value = ${Ee(e,d)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_inner && col < uniforms.dim_b_outer)
      {
        var bIndices: ${u.type.indices};
        ${pi("bIndices",u,u.rank-2,r.rank,"batchIndices")}
        ${u.indicesSet("bIndices",u.rank-2,"u32(row)")}
        ${u.indicesSet("bIndices",u.rank-1,"u32(colIn)")}
        value = ${u.getByIndices("bIndices")};
      }
      return value;
    }

    fn mm_write(batch: i32, row: i32, colIn: i32, valueIn: ${Ee(e,d)}) {
      let col = colIn * ${e};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer) {
        var value = valueIn;
        let coords = vec3<i32>(batch, row, colIn);
        ${t?`value = value + ${n?"bias[colIn]":`${Ee(e,d)}(bias[row])`};`:""}
        ${i}
        ${p.setByIndices("vec3<u32>(coords)","value")}
      }
    }
    `},ji=(e,t,i,a,n=!1,r)=>{let o=e[0].dims,u=e[1].dims,p=o.slice(0,-2),d=u.slice(0,-2),f=a?a.slice(0,-2):i.slice(0,-2),m=O.size(f),g=o[o.length-2],_=o[o.length-1],b=u[u.length-1],w=_%4===0&&b%4===0,C=g<=8?[4,1,1]:[4,4,1],v=[8,8,1],$=[Math.ceil(b/v[0]/C[0]),Math.ceil(g/v[1]/C[1]),Math.ceil(m/v[2]/C[2])],T=w?4:1,k=[...p,g,_/T],S=k.length,E=[...d,_,b/T],z=E.length,R=[m,g,b/T],M=[{type:6,data:g},{type:6,data:b},{type:6,data:_}];Nt(t,M),M.push(...Q(f,k,E));let L=["rank","rank"],J=e.length>2;J&&(M.push(...Q(e[2].dims)),L.push("rank")),M.push(...Q(R));let H=j=>{let le=f.length,ae=Va("batchDims",e[0].dataType,le,1),Z=Se(e[0].dataType),se=N("a",e[0].dataType,S,T),Y=N("b",e[1].dataType,z,T),te=K("result",e[0].dataType,R.length,T),ge=[se,Y];if(J){let Te=n?T:1;ge.push(N("bias",e[2].dataType,e[2].dims.length,Te))}let D=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"}];Dt(t,D);let V=Se(te.type.tensor),G=Bt(t,te.type.value,V),ee=Go(T,J,G,[ae,se,Y,te],n);return`
  ${j.registerUniforms(D).registerInternalVariables(ae).declareVariables(...ge,te)}
  ${ee}
  ${w?Ca(C,v,Z,ae):Ta(C,v,Z,ae)}
                   `};return{name:"MatMul",shaderCache:{hint:`${C};${t.activation};${w};${n}`,inputDependencies:L},getRunData:()=>({outputs:[{dims:r?r(i):i,dataType:e[0].dataType}],dispatchGroup:{x:$[0],y:$[1],z:$[2]},programUniforms:M}),getShaderSource:H}}}),Ho,sc,Pm=q(()=>{re(),lt(),oe(),Pt(),Ka(),Mm(),Xa(),Ho=(e,t,i,a,n=!1,r,o=4,u=4,p=4,d="f32")=>{let f=M=>{switch(M){case 1:return"resData = x[xIndex];";case 3:return`resData = vec3<${d}>(x[xIndex], x[xIndex + 1], x[xIndex + 2]);`;case 4:return"resData = x[xIndex / 4];";default:throw new Error(`innerElementSize ${M} is not supported.`)}},m=M=>{switch(M){case 1:return"return w[row * i32(uniforms.w_shape[3]) + colIn];";case 4:return"return w[row * i32(uniforms.w_shape[3]) / 4 + colIn];";default:throw new Error(`innerElementSize ${M} is not supported.`)}},g=e?`
    let coord = vec4<i32>(batch, xRow, xCol, xCh);
    `:`
    let coord = vec4<i32>(batch, xCh, xRow, xCol);
    `,_=e?`
    let coords = vec4<i32>(
      batch,
      row / outWidth,
      row % outWidth,
      col);
    `:`
    let coords = vec4<i32>(
      batch,
      row,
      col / outWidth,
      col % outWidth);
    `,b=e?"i32(uniforms.x_shape[1])":"i32(uniforms.x_shape[2])",w=e?"i32(uniforms.x_shape[2])":"i32(uniforms.x_shape[3])",C=e?"row":"col",v=e?"col":"row",$=`
    let inChannels = i32(uniforms.w_shape[2]);
    let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
    let outRow = ${C} / outWidth;
    let outCol = ${C} % outWidth;

    let WRow = ${v} / (i32(uniforms.w_shape[1]) * inChannels);
    let WCol = ${v} / inChannels % i32(uniforms.w_shape[1]);
    let xRow = outRow * uniforms.stride[0] + uniforms.dilation[0] * WRow - uniforms.pad[0];
    let xCol = outCol * uniforms.stride[1] + uniforms.dilation[1] * WCol - uniforms.pad[1];
    let xCh = ${v} % inChannels;
    var resData = ${Ee(o,d)}(0.0);
    // The bounds checking is always needed since we use it to pad zero for
    // the 'same' padding type.
    if (xRow >= 0 && xRow < ${b} && xCol >= 0 && xCol < ${w}) {
      ${g}
      let xIndex = getIndexFromCoords4D(coord, vec4<i32>(uniforms.x_shape));
      ${f(o)}
    }
    return resData;`,T=e?t&&a?`
    let col = colIn * ${o};
    ${$}`:`
    let col = colIn * ${o};
    if (row < uniforms.dim_a_outer && col < uniforms.dim_inner) {
      ${$}
    }
    return ${Ee(o,d)}(0.0);`:a&&i?`
    let col = colIn * ${o};
    ${$}`:`
    let col = colIn * ${o};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${$}
    }
    return ${Ee(o,d)}(0.0);`,k=e?a&&i?m(u):`
    let col = colIn * ${u};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${m(u)}
    }
    return ${Ee(u,d)}(0.0);`:`
    let col = colIn * ${u};
    if (row < uniforms.dim_inner && col < uniforms.dim_a_outer) {
      ${m(u)}
    }
    return ${Ee(u,d)}(0.0);`,S=Ee(p,d),E=Ee(e?o:u,d),z=Ee(e?u:o,d),R=Bt(r,S,d);return`
    fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${E} {
      ${e?T:k}
    }

    fn mm_readB(batch: i32, row : i32, colIn : i32) -> ${z} {
      ${e?k:T}
    }

    fn mm_write(batch: i32, row : i32, colIn : i32, valueIn : ${S}) {
      let col = colIn * ${p};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer)
      {
      var value = valueIn;
      let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
      ${_}
      ${ac(n)}
      ${R}
      setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);
      }
    }`},sc=(e,t,i,a,n,r,o,u,p)=>{let d=t.format==="NHWC",f=d?e[0].dims[3]:e[0].dims[1],m=i[0],g=d?i[2]:i[3],_=d?i[1]:i[2],b=d?i[3]:i[1],w=d&&(f%4===0||f%3===0)&&b%4===0,C=d?b:g*_,v=d?g*_:b,$=[8,8,1],T=a<=8?[4,1,1]:[4,4,1],k=[Math.ceil(C/$[0]/T[0]),Math.ceil(v/$[1]/T[1]),Math.ceil(m/$[2]/T[2])];de("verbose",()=>`[conv2d_mm_webgpu] dispatch = ${k}`);let S=w?d&&f%4!==0?3:4:1,E=$[1]*T[1],z=$[0]*T[0],R=Math.max($[0]*S,$[1]),M=a%E===0,L=n%z===0,J=r%R===0,H=w?[S,4,4]:[1,1,1],j=[{type:6,data:a},{type:6,data:n},{type:6,data:r},{type:6,data:[t.pads[0],t.pads[1]]},{type:6,data:t.strides},{type:6,data:t.dilations}];Nt(t,j),j.push(...Q(e[0].dims,e[1].dims));let le=["rank","rank"];o&&(j.push(...Q(e[2].dims)),le.push("rank")),j.push(...Q(i));let ae=Z=>{let se=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"},{name:"pad",type:"i32",length:2},{name:"stride",type:"i32",length:2},{name:"dilation",type:"i32",length:2}];Dt(t,se);let Y=w?4:1,te=Se(e[0].dataType),ge=`
      fn setOutputAtIndex(flatIndex : i32, value : ${w?`vec4<${te}>`:te}) {
        result[flatIndex] = ${w?`vec4<${te}>`:te}(value);
      }
      fn setOutputAtCoords(d0 : i32, d1 : i32, d2 : i32, d3 : i32, value : ${w?`vec4<${te}>`:te}) {
        let flatIndex = getOutputIndexFromCoords(vec4<i32>(d0, d1, d2, d3));
        setOutputAtIndex(flatIndex ${w?"/ 4":""}, value);
      }`,D=N("x",e[0].dataType,e[0].dims.length,S===3?1:S),V=N("w",e[1].dataType,e[1].dims.length,Y),G=[D,V],ee=K("result",e[0].dataType,i.length,Y);if(o){let Te=N("bias",e[2].dataType,e[2].dims.length,Y);G.push(Te),ge+=`
        fn getBiasByOutputCoords(coords : vec4<i32>) -> ${w?`vec4<${te}>`:te} {
          return bias[coords.${d?"w":"y"}${w?"/ 4":""}];
        }`}return`
        ${nc("uniforms.result_strides")}
        //struct Uniforms { xShape : vec4<i32>, wShape : vec4<i32>, outShape : vec4<i32>,
        //  outShapeStrides: vec3<i32>, filterDims : vec2<i32>, pad : vec2<i32>, stride : vec2<i32>,
        //  dilation : vec2<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32 };
        ${Z.registerUniforms(se).declareVariables(...G,ee)}
        ${ge}
        ${Ho(d,M,L,J,o,t,H[0],H[1],H[2],te)}
        ${w?Ca(T,$,te,void 0,!d,R):Ta(T,$,te,void 0,!d,R,!1,void 0,u)}`};return{name:"Conv2DMatMul",shaderCache:{hint:`${t.cacheKey};${S};${w};${M};${L};${J};${E};${z};${R}`,inputDependencies:le},getRunData:()=>({outputs:[{dims:p?p(i):i,dataType:e[0].dataType}],dispatchGroup:{x:k[0],y:k[1],z:k[2]},programUniforms:j}),getShaderSource:ae}}}),Fo,Lr,ti,Ko,Vr,Zo,oc,uc,Um=q(()=>{re(),lt(),ne(),oe(),Pt(),Ka(),Fo=e=>{let t=1;for(let i=0;i<e.length;i++)t*=e[i];return t},Lr=e=>typeof e=="number"?[e,e,e]:e,ti=(e,t)=>t<=1?e:e+(e-1)*(t-1),Ko=(e,t,i,a=1)=>{let n=ti(t,a);return Math.floor((e[0]*(i-1)-i+n)/2)},Vr=(e,t,i,a,n)=>{n==null&&(n=Ko(e,t[0],a[0]));let r=[0,0,0,i];for(let o=0;o<3;o++)e[o]+2*n>=t[o]&&(r[o]=Math.trunc((e[o]-t[o]+2*n)/a[o]+1));return r},Zo=(e,t,i,a,n,r,o,u,p,d)=>{let f,m,g,_;if(e==="VALID"&&(e=0),typeof e=="number"){f={top:e,bottom:e,left:e,right:e,front:e,back:e};let b=Vr([t,i,a,1],[u,p,d],1,[n,r,o],e);m=b[0],g=b[1],_=b[2]}else if(Array.isArray(e)){if(!e.every((w,C,v)=>w===v[0]))throw Error(`Unsupported padding parameter: ${e}`);f={top:e[0],bottom:e[1],left:e[2],right:e[3],front:e[4],back:e[5]};let b=Vr([t,i,a,1],[u,p,d],1,[n,r,o],e[0]);m=b[0],g=b[1],_=b[2]}else if(e==="SAME_UPPER"){m=Math.ceil(t/n),g=Math.ceil(i/r),_=Math.ceil(a/o);let b=(m-1)*n+u-t,w=(g-1)*r+p-i,C=(_-1)*o+d-a,v=Math.floor(b/2),$=b-v,T=Math.floor(w/2),k=w-T,S=Math.floor(C/2),E=C-S;f={top:T,bottom:k,left:S,right:E,front:v,back:$}}else throw Error(`Unknown padding parameter: ${e}`);return{padInfo:f,outDepth:m,outHeight:g,outWidth:_}},oc=(e,t,i,a,n,r=!1,o="channelsLast")=>{let u,p,d,f,m;if(o==="channelsLast")[u,p,d,f,m]=e;else if(o==="channelsFirst")[u,m,p,d,f]=e;else throw new Error(`Unknown dataFormat ${o}`);let[g,,_,b,w]=t,[C,v,$]=Lr(i),[T,k,S]=Lr(a),E=ti(_,T),z=ti(b,k),R=ti(w,S),{padInfo:M,outDepth:L,outHeight:J,outWidth:H}=Zo(n,p,d,f,C,v,$,E,z,R),j=r?g*m:g,le=[0,0,0,0,0];return o==="channelsFirst"?le=[u,j,L,J,H]:o==="channelsLast"&&(le=[u,L,J,H,j]),{batchSize:u,dataFormat:o,inDepth:p,inHeight:d,inWidth:f,inChannels:m,outDepth:L,outHeight:J,outWidth:H,outChannels:j,padInfo:M,strideDepth:C,strideHeight:v,strideWidth:$,filterDepth:_,filterHeight:b,filterWidth:w,effectiveFilterDepth:E,effectiveFilterHeight:z,effectiveFilterWidth:R,dilationDepth:T,dilationHeight:k,dilationWidth:S,inShape:e,outShape:le,filterShape:t}},uc=(e,t,i,a,n,r)=>{let o=r==="channelsLast";o?e[0].dims[3]:e[0].dims[1];let u=[64,1,1],p={x:i.map((C,v)=>v)},d=[Math.ceil(Fo(p.x.map(C=>i[C]))/u[0]),1,1];de("verbose",()=>`[conv3d_naive_webgpu] dispatch = ${d}`);let f=1,m=O.size(i),g=[{type:12,data:m},{type:12,data:a},{type:12,data:n},{type:12,data:t.strides},{type:12,data:t.dilations}];Nt(t,g),g.push(...Q(e[0].dims,e[1].dims));let _=["rank","rank"],b=e.length===3;b&&(g.push(...Q(e[2].dims)),_.push("rank")),g.push(...Q(i));let w=C=>{let v=[{name:"output_size",type:"u32"},{name:"filter_dims",type:"u32",length:a.length},{name:"pads",type:"u32",length:n.length},{name:"strides",type:"u32",length:t.strides.length},{name:"dilations",type:"u32",length:t.dilations.length}];Dt(t,v);let $=1,T=Se(e[0].dataType),k=N("x",e[0].dataType,e[0].dims.length,f),S=N("W",e[1].dataType,e[1].dims.length,$),E=[k,S],z=K("result",e[0].dataType,i.length,$),R="";if(b){let J=N("bias",e[2].dataType,e[2].dims.length,$);E.push(J),R+=`
        fn getBiasByOutputCoords(coords : array<u32, 5>) -> ${T} {
          return bias[${o?X("coords",4,5):X("coords",1,5)}];
        }`}let M=Ee(f,T),L=Bt(t,M,T);return`
            ${R}
            fn getX(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${k.getByIndices("aIndices")};
            }
            fn getW(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${S.getByIndices("aIndices")};
            }
          ${C.registerUniforms(v).declareVariables(...E,z)}
          ${C.mainStart()}
          ${C.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
              let coords = ${z.offsetToIndices("global_idx")};
              let batch = ${X("coords",0,k.rank)};
              let d2 = ${o?X("coords",k.rank-1,k.rank):X("coords",1,k.rank)};
              let xFRCCorner = vec3<u32>(${o?X("coords",1,k.rank):X("coords",2,k.rank)},
              ${o?X("coords",2,k.rank):X("coords",3,k.rank)},
              ${o?X("coords",3,k.rank):X("coords",4,k.rank)}) * uniforms.strides - uniforms.pads;
              let xFCorner = xFRCCorner.x;
              let xRCorner = xFRCCorner.y;
              let xCCorner = xFRCCorner.z;
              let xShapeY = ${o?X("uniforms.x_shape",1,k.rank):X("uniforms.x_shape",2,k.rank)};
              let xShapeZ = ${o?X("uniforms.x_shape",2,k.rank):X("uniforms.x_shape",3,k.rank)};
              let xShapeW = ${o?X("uniforms.x_shape",3,k.rank):X("uniforms.x_shape",4,k.rank)};
              let xShapeU = ${o?X("uniforms.x_shape",4,k.rank):X("uniforms.x_shape",1,k.rank)};
              let inputDepthNearestVec4 = (xShapeU / 4) * 4;
              let inputDepthVec4Remainder = xShapeU % 4;

              var value = 0.0;
              for (var wF = 0u; wF < uniforms.filter_dims[0]; wF++) {
                let xF = xFCorner + wF * uniforms.dilations[0];
                if (xF < 0 || xF >= xShapeY) {
                  continue;
                }

                for (var wR = 0u; wR < uniforms.filter_dims[1]; wR++) {
                  let xR = xRCorner + wR * uniforms.dilations[1];
                  if (xR < 0 || xR >= xShapeZ) {
                    continue;
                  }

                  for (var wC = 0u; wC < uniforms.filter_dims[2]; wC++) {
                    let xC = xCCorner + wC * uniforms.dilations[2];
                    if (xC < 0 || xC >= xShapeW) {
                      continue;
                    }

                    for (var d1 = 0u; d1 < inputDepthNearestVec4; d1 += 4) {
                      ${o?`let xValues = vec4<f32>(
                               getX(batch, xF, xR, xC, d1),
                               getX(batch, xF, xR, xC, d1 + 1),
                               getX(batch, xF, xR, xC, d1 + 2),
                               getX(batch, xF, xR, xC, d1 + 3));
                            `:`let xValues = vec4<f32>(
                               getX(batch, d1, xF, xR, xC),
                               getX(batch, d1 + 1, xF, xR, xC),
                               getX(batch, d1 + 2, xF, xR, xC),
                               getX(batch, d1 + 3, xF, xR, xC));
                            `}
                            let wValues = vec4<f32>(
                              getW(d2, d1, wF, wR, wC),
                              getW(d2, d1 + 1, wF, wR, wC),
                              getW(d2, d1 + 2, wF, wR, wC),
                              getW(d2, d1 + 3, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                    if (inputDepthVec4Remainder == 1) {
                        ${o?`value += getX(batch, xF, xR, xC, inputDepthNearestVec4)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`:`value += getX(batch, inputDepthNearestVec4, xF, xR, xC)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`}
                    } else if (inputDepthVec4Remainder == 2) {
                      ${o?`let xValues = vec2<f32>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1));
                      `:`let xValues = vec2<f32>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC));
                    `}
                    let wValues = vec2<f32>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC));
                      value += dot(xValues, wValues);
                    } else if (inputDepthVec4Remainder == 3) {
                      ${o?`let xValues = vec3<f32>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 2));
                      `:`let xValues = vec3<f32>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 2, xF, xR, xC));
                    `}
                    let wValues = vec3<f32>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 2, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                  }
                }
              }
              ${b?"value = value + getBiasByOutputCoords(coords)":""};
              ${L}
              result[global_idx] = f32(value);
          }`};return{name:"Conv3DNaive",shaderCache:{hint:`${t.cacheKey};${o};${f};${b}`,inputDependencies:_},getRunData:()=>({outputs:[{dims:i,dataType:e[0].dataType}],dispatchGroup:{x:d[0],y:d[1],z:d[2]},programUniforms:g}),getShaderSource:w}}}),lc,dc,qm=q(()=>{re(),ne(),oe(),Pt(),lc=(e,t,i,a)=>{let n=e.length>2,r=n?"value += b[output_channel];":"",o=e[0].dims,u=e[1].dims,p=t.format==="NHWC",d=p?i[3]:i[1],f=d/t.group,m=p&&f>=4?ve(d):1,g=O.size(i)/m,_=[{type:12,data:g},{type:12,data:t.dilations},{type:12,data:[t.strides[0],t.strides[1]]},{type:12,data:[t.pads[0],t.pads[1]]},{type:12,data:f}];Nt(t,_),_.push(...Q(o,[u[0],u[1],u[2],u[3]/m]));let b=n?["rank","rank","rank"]:["rank","rank"];_.push(...Q([i[0],i[1],i[2],i[3]/m]));let w=C=>{let v=K("output",e[0].dataType,i.length,m),$=Se(v.type.tensor),T=Bt(t,v.type.value,$),k=N("x",e[0].dataType,o.length),S=N("w",e[1].dataType,u.length,m),E=[k,S];n&&E.push(N("b",e[2].dataType,e[2].dims,m));let z=[{name:"output_size",type:"u32"},{name:"dilations",type:"u32",length:t.dilations.length},{name:"strides",type:"u32",length:2},{name:"pads",type:"u32",length:2},{name:"output_channels_per_group",type:"u32"}];Dt(t,z);let R=p?`
      for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[0]; wHeight++) {
        let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

        if (xHeight < 0u || xHeight >= uniforms.x_shape[1]) {
          continue;
        }

        for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[1]; wWidth++) {
          let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
          if (xWidth < 0u || xWidth >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[2]; wInChannel++) {
            let input_channel = in_channel_offset + wInChannel;
            let xVal = ${k.get("batch","xHeight","xWidth","input_channel")};
            let wVal = ${S.get("wHeight","wWidth","wInChannel","output_channel")};
            value += xVal * wVal;
          }
        }
      }
      `:`
      for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[1]; wInChannel++) {
        let input_channel = in_channel_offset + wInChannel;
        for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[2]; wHeight++) {
          let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

          if (xHeight < 0u || xHeight >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[3]; wWidth++) {
            let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
            if (xWidth < 0u || xWidth >= uniforms.x_shape[3]) {
              continue;
            }

            let xVal = ${k.get("batch","input_channel","xHeight","xWidth")};
            let wVal = ${S.get("output_channel","wInChannel","wHeight","wWidth")};
            value += xVal * wVal;
          }
        }
      }
      `;return`
  ${C.registerUniforms(z).declareVariables(...E,v)}

  ${C.mainStart()}
    ${C.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let outputIndices = ${v.offsetToIndices("global_idx")};
    let batch: u32 = outputIndices[0];
    let output_channel: u32 = outputIndices[${p?3:1}];
    let xRCCorner: vec2<u32> = vec2<u32>(outputIndices[${p?1:2}], outputIndices[${p?2:3}]) * uniforms.strides - uniforms.pads;
    let group_id: u32 = output_channel * ${m} / uniforms.output_channels_per_group;
    var in_channel_offset = group_id * uniforms.w_shape[${p?2:1}];

    var value: ${v.type.value} = ${v.type.value}(0);
    ${R}
    ${r}
    ${T}
    ${v.setByOffset("global_idx","value")}
  }`};return{name:"GroupedConv",shaderCache:{hint:`${t.cacheKey}_${m}`,inputDependencies:b},getRunData:()=>({outputs:[{dims:a?a(i):i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(g/64)},programUniforms:_}),getShaderSource:w}},dc=(e,t,i,a)=>{let n=e.length>2,r=ve(i[3]),o=ve(i[2]),u=O.size(i)/r/o,p=[e[0].dims[0],e[0].dims[1],e[0].dims[2],e[0].dims[3]/r],d=[e[1].dims[0],e[1].dims[1],e[1].dims[2],e[1].dims[3]/r],f=[i[0],i[1],i[2],i[3]/r],m=[{type:12,data:u},{type:6,data:[t.strides[0],t.strides[1]]},{type:6,data:[t.pads[0],t.pads[1]]}];Nt(t,m),m.push(...Q(p,d,f));let g=(o-1)*t.strides[1]+d[1],_=b=>{let w=K("output",e[0].dataType,f.length,r),C=Se(w.type.tensor),v=Bt(t,w.type.value,C),$=N("x",e[0].dataType,p.length,r),T=N("w",e[1].dataType,d.length,r),k=[$,T];n&&k.push(N("b",e[2].dataType,e[2].dims,r));let S=n?"value += b[output_channel];":"",E=[{name:"output_size",type:"u32"},{name:"strides",type:"i32",length:2},{name:"pads",type:"i32",length:2}];return Dt(t,E),`
  ${b.registerUniforms(E).declareVariables(...k,w)}
  ${b.mainStart()}
    ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let width0 = uniforms.output_shape[3];
    let output_channel = global_idx % width0;
    var index1 = global_idx / width0;
    let width1 = uniforms.output_shape[2] / ${o}u;
    let col = (index1 % width1) * ${o}u;
    index1 = index1 / width1;
    let row = index1 % uniforms.output_shape[1];
    let batch = index1 / uniforms.output_shape[1];

    let x_corner = vec2<i32>(i32(row), i32(col)) * uniforms.strides - uniforms.pads;

    var x_vals: array<${$.type.value}, ${g}>;
    var values: array<${w.type.value}, ${o}>;
    let input_channel = output_channel;
    // Use constant instead of uniform can give better performance for w's height/width.
    for (var w_height: u32 = 0u; w_height < ${d[0]}; w_height++) {
      let x_height = x_corner.x + i32(w_height);
      if (x_height >= 0 && u32(x_height) < uniforms.x_shape[1]) {
        for (var i = 0; i < ${g}; i++) {
          let x_width = x_corner.y + i;
          if (x_width >= 0 && u32(x_width) < uniforms.x_shape[2]) {
            x_vals[i] = ${$.get("batch","u32(x_height)","u32(x_width)","input_channel")};
          } else {
            x_vals[i] = ${$.type.value}(0);
          }
        }
        for (var w_width: u32 = 0u; w_width < ${d[1]}; w_width++) {
          let w_val = ${T.get("w_height","w_width","0","output_channel")};
          for (var i = 0u; i < ${o}u; i++) {
            values[i] = fma(x_vals[i * u32(uniforms.strides[1]) + w_width], w_val, values[i]);
          }
        }
      }
    }

    for (var i = 0u; i < ${o}u; i++) {
      var value = values[i];
      ${S}
      ${v}
      ${w.set("batch","row","col + i","output_channel","value")};
    }
  }`};return{name:"GroupedConv-Vectorize",shaderCache:{hint:`${t.cacheKey};${r};${o};${g};${d[0]};${d[1]}`,inputDependencies:n?["rank","rank","type"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:a?a(i):i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:m}),getShaderSource:_}}}),Yo,Ai,Xo,Oi,ka,jr,Qo,Jo,Sa,Wm=q(()=>{ne(),Pm(),Um(),Xa(),qm(),Pt(),Ya(),bt(),Yo=(e,t,i,a,n,r)=>{let o=e[0],u=e.slice(r?1:2,r?3:4),p=u.length,d=t[0],f=t.slice(2).map((g,_)=>g+(g-1)*(i[_]-1)),m=u.map((g,_)=>g+a[_]+a[_+p]).map((g,_)=>Math.floor((g-f[_]+n[_])/n[_]));return m.splice(0,0,o),m.splice(r?3:1,0,d),m},Ai=[2,3,1,0],Xo=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length>5)throw new Error("greater than 5D is not supported");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let i=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],a=e[1].dims[1]*t.group;if(i!==a)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");if(e.length===3&&(e[2].dims.length!==1||e[1].dims[0]!==e[2].dims[0]))throw new Error("invalid bias");let n=e[0].dims.length-2;if(t.dilations.length!==n)throw new Error(`dilations should be ${n}D`);if(t.strides.length!==n)throw new Error(`strides should be ${n}D`);if(t.pads.length!==n*2)throw new Error(`pads should be ${n*2}D`);if(t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape")},Oi=(e,t)=>{let i=e.kernelShape.slice();i.length<t[1].dims.length-2&&i.push(...Array(t[1].dims.length-2-i.length).fill(0));for(let r=2;r<t[1].dims.length;++r)i[r-2]===0&&(i[r-2]=t[1].dims[r]);let a=e.pads.slice();Li.adjustPadsBasedOnAutoPad(t[0].dims,e.strides,e.dilations,i,a,e.format==="NHWC",e.autoPad);let n=Object.assign({},e);return Object.assign(n,{kernelShape:i,pads:a}),n},ka=e=>{let t=Fa(e),i=e.format,a=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],n=e.dilations,r=e.group,o=e.kernel_shape,u=e.pads,p=e.strides,d=e.w_is_const();return{autoPad:a,format:i,dilations:n,group:r,kernelShape:o,pads:u,strides:p,wIsConst:d,...t,cacheKey:`${e.format};${t.activation};`}},jr=(e,t,i,a)=>{let n=i.format==="NHWC",r=Yo(t[0].dims,t[1].dims,i.dilations,i.pads,i.strides,n);if(i.group!==1){let E=[t[0]];if(n){let z=e.kernelCustomData.wT??e.compute(qe(t[1],Ai),{inputs:[1],outputs:[i.wIsConst?-2:-1]})[0];i.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=z),E.push(z)}else E.push(t[1]);t.length===3&&E.push(t[2]),!e.adapterInfo.isArchitecture("ampere")&&n&&t[1].dims[0]===i.group&&t[1].dims[1]===1&&i.dilations[0]===1&&i.dilations[1]===1?e.compute(dc(E,i,r,a),{inputs:E}):e.compute(lc(E,i,r,a),{inputs:E});return}let o=t.length===3,u=t[0].dims[n?1:2],p=t[0].dims[n?2:3],d=t[0].dims[n?3:1],f=t[1].dims[2],m=t[1].dims[3],g=r[n?1:2],_=r[n?2:3],b=r[n?3:1],w=n&&f===u&&m===p&&i.pads[0]===0&&i.pads[1]===0;if(w||f===1&&m===1&&i.dilations[0]===1&&i.dilations[1]===1&&i.strides[0]===1&&i.strides[1]===1&&i.pads[0]===0&&i.pads[1]===0){let E=r[0],z,R,M,L=[];if(n){let j=e.kernelCustomData.wT??e.compute(qe(t[1],Ai),{inputs:[1],outputs:[i.wIsConst?-2:-1]})[0];if(i.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=j),w){let le=u*p*d;z=t[0].reshape([1,E,le]),R=j.reshape([1,le,b]),M=[1,E,b]}else z=t[0].reshape([E,u*p,d]),R=j.reshape([1,d,b]),M=[E,g*_,b];L.push(z),L.push(R)}else z=t[0].reshape([E,d,u*p]),R=t[1].reshape([1,b,d]),M=[E,b,g*_],L.push(R),L.push(z);o&&L.push(t[2]);let J=M[2],H=L[0].dims[L[0].dims.length-1];J<8&&H<8?e.compute(Za(L,i,r,M,n,a),{inputs:L}):e.compute(ji(L,i,r,M,n,a),{inputs:L});return}let C=!0,v=e.kernelCustomData.wT??e.compute(qe(t[1],Ai),{inputs:[1],outputs:[i.wIsConst?-2:-1]})[0];i.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=v);let $=[t[0],v];o&&$.push(t[2]);let T=n?g*_:b,k=n?b:g*_,S=f*m*d;e.compute(sc($,i,r,T,k,S,o,C,a),{inputs:$})},Qo=(e,t)=>{let i=t.format==="NHWC",a=[e.inputs[0].reshape(i?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&a.push(e.inputs[2]);let n=[0,t.pads[0],0,t.pads[1]],r=[1].concat(t.strides),o=[1].concat(t.dilations),u=[1].concat(t.kernelShape),p=Oi({...t,pads:n,strides:r,dilations:o,kernelShape:u},a);jr(e,a,p,d=>i?[d[0],d[2],d[3]]:[d[0],d[1],d[3]])},Jo=(e,t,i)=>{let a=i.format==="NHWC"?"channelsLast":"channelsFirst",n=Oi(i,t),r=i.autoPad==="NOTSET"?i.pads:i.autoPad,o=oc(t[0].dims,t[1].dims,i.strides,i.dilations,r,!1,a);e.compute(uc(t,n,o.outShape,[o.filterDepth,o.filterHeight,o.filterWidth],[o.padInfo.front,o.padInfo.top,o.padInfo.left],a))},Sa=(e,t)=>{if(Xo(e.inputs,t),e.inputs[0].dims.length===3)Qo(e,t);else if(e.inputs[0].dims.length===5)Jo(e,e.inputs,t);else{let i=Oi(t,e.inputs);jr(e,e.inputs,i)}}}),pc,Lm=q(()=>{re(),lt(),ne(),oe(),pc=(e,t,i)=>{let a=e.length>2,n=t.outputShape,r=t.format==="NHWC",o=t.group,u=e[1].dims,p=u[2]/o,d=u[3],f=r?ve(p):1,m=r&&d===1&&p>=4,g=m?Math.floor(p/4)*4:Math.floor(p/f)*f,_=p-g,b=r?ve(d):1,w=r?d===1?f:b:1,C=O.size(n)/b,v=[Math.ceil(C/64),1,1];de("verbose",()=>`[conv2d_backprop_webgpu] dispatch = ${v}`);let $=["rank","rank"],T=[t.strides[0],t.strides[1]],k=[t.kernelShape[r?1:2],t.kernelShape[r?2:3]],S=[t.dilations[0],t.dilations[1]],E=[k[0]+(t.dilations[0]<=1?0:(t.kernelShape[r?1:2]-1)*(t.dilations[0]-1)),k[1]+(t.dilations[1]<=1?0:(t.kernelShape[r?2:3]-1)*(t.dilations[1]-1))],z=[E[0]-1-Math.floor((t.pads[0]+t.pads[2])/2),E[1]-1-Math.floor((t.pads[1]+t.pads[3])/2)],R=[{type:12,data:C},{type:12,data:T},{type:12,data:k},{type:12,data:S},{type:12,data:E},{type:6,data:z},{type:12,data:g},{type:12,data:p},{type:12,data:d},...Q(e[0].dims,e[1].dims)];a&&(R.push(...Q(e[2].dims)),$.push("rank")),R.push(...Q(n));let M=L=>{let J=[{name:"output_size",type:"u32"},{name:"strides",type:"u32",length:T.length},{name:"filter_dims",type:"u32",length:k.length},{name:"dilations",type:"u32",length:k.length},{name:"effective_filter_dims",type:"u32",length:E.length},{name:"pads",type:"i32",length:z.length},{name:"input_channels_per_group_int",type:"u32"},{name:"input_channels_per_group",type:"u32"},{name:"output_channels_per_group",type:"u32"}],H=Se(e[0].dataType),j=r?1:2,le=r?2:3,ae=r?3:1,Z=N("W",e[1].dataType,e[1].dims.length,w),se=N("Dy",e[0].dataType,e[0].dims.length,f),Y=[se,Z];a&&Y.push(N("bias",e[2].dataType,[n[ae]].length,b));let te=K("result",e[0].dataType,n.length,b),ge=()=>{let G="";if(m)f===4?G+=`
        let xValue = ${se.getByOffset("x_offset")};
        let wValue = ${Z.getByOffset("w_offset")};
        dotProd = dotProd + dot(xValue, wValue);
        x_offset += 1u;
        w_offset += 1u;`:f===2?G+=`
          dotProd = dotProd + dot(vec4<${H}>(${se.getByOffset("x_offset")}, ${se.getByOffset("x_offset + 1u")}), vec4<${H}>(${Z.getByOffset("w_offset")}, ${Z.getByOffset("w_offset + 1u")}));
          x_offset += 2u;
          w_offset += 2u;`:f===1&&(G+=`
          dotProd = dotProd + dot(vec4<${H}>(${se.getByOffset("x_offset")}, ${se.getByOffset("x_offset + 1u")}, ${se.getByOffset("x_offset + 2u")}, ${se.getByOffset("x_offset + 3u")}), vec4<${H}>(${Z.getByOffset("w_offset")}, ${Z.getByOffset("w_offset + 1u")}, ${Z.getByOffset("w_offset + 2u")}, ${Z.getByOffset("w_offset + 3u")}));
          x_offset += 4u;
          w_offset += 4u;`);else if(G+=`
                  let xValue = ${r?se.getByOffset(`${se.indicesToOffset(`${se.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${f}`):se.get("batch","inputChannel","idyR","idyC")};
        `,f===1)G+=`
          let w_offset = ${Z.indicesToOffset(`${Z.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel, wOutChannel)`)};
          let wValue = ${Z.getByOffset(`w_offset / ${w}`)};
          dotProd = dotProd + xValue * wValue;`;else for(let ee=0;ee<f;ee++)G+=`
            let wValue${ee} = ${Z.getByOffset(`${Z.indicesToOffset(`${Z.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel + ${ee}, wOutChannel)`)} / ${w}`)};
            dotProd = dotProd + xValue[${ee}] * wValue${ee};`;return G},D=()=>{if(_===0)return"";if(!m)throw new Error(`packInputAs4 ${m} is not true.`);let G="";if(f===1){G+="dotProd = dotProd";for(let ee=0;ee<_;ee++)G+=`
            + ${se.getByOffset(`x_offset + ${ee}`)} * ${Z.getByOffset(`w_offset + ${ee}`)}`;G+=";"}else if(f===2){if(_!==2)throw new Error(`Invalid inputChannelsRemainder ${_}.`);G+=`
          let xValue = ${se.getByOffset("x_offset")};
          let wValue = ${Z.getByOffset("w_offset")};
          dotProd = dotProd + dot(xValue, wValue);`}return G},V=`
            let outputIndices = ${te.offsetToIndices(`global_idx * ${b}`)};
            let batch = ${te.indicesGet("outputIndices",0)};
            let d1 = ${te.indicesGet("outputIndices",ae)};
            let r = ${te.indicesGet("outputIndices",j)};
            let c = ${te.indicesGet("outputIndices",le)};
            let dyCorner = vec2<i32>(i32(r), i32(c)) - uniforms.pads;
            let dyRCorner = dyCorner.x;
            let dyCCorner = dyCorner.y;
            let groupId = d1 / uniforms.output_channels_per_group;
            let wOutChannel = d1 - groupId * uniforms.output_channels_per_group;
            // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
            // ? = to be determined. : = across all values in that axis.
            var dotProd = ${te.type.value}(0.0);
            var wR: u32 = 0;
            if (uniforms.dilations.x == 1) {
              // Minimum wR >= 0 that satisfies (dyRCorner + wR) % (uniforms.strides.x) == 0
              wR = u32(((dyRCorner + i32(uniforms.strides.x) - 1) / i32(uniforms.strides.x)) * i32(uniforms.strides.x) - dyRCorner);
            }
            for (; wR < uniforms.effective_filter_dims.x; wR = wR + 1) {
              if (wR % uniforms.dilations.x != 0) {
                continue;
              }
              let dyR = (${H}(dyRCorner) + ${H}(wR)) / ${H}(uniforms.strides[0]);
              let wRPerm = uniforms.filter_dims.x - 1 - wR / uniforms.dilations.x;
              if (dyR < 0.0 || dyR >= ${H}(uniforms.Dy_shape[${j}]) || fract(dyR) > 0.0 ||
                  wRPerm < 0) {
                continue;
              }
              let idyR: u32 = u32(dyR);
              var wC: u32 = 0;
              if (uniforms.dilations.y == 1) {
                // Minimum wC >= 0 that satisfies (dyCCorner + wC) % (uniforms.strides.y) == 0
                wC = u32(((dyCCorner + i32(uniforms.strides.y) - 1) / i32(uniforms.strides.y)) * i32(uniforms.strides.y) - dyCCorner);
              }
              for (; wC < uniforms.effective_filter_dims.y; wC = wC + 1) {
                if (wC % uniforms.dilations.y != 0) {
                  continue;
                }
                let dyC = (${H}(dyCCorner) + ${H}(wC)) / ${H}(uniforms.strides.y);
                let wCPerm = uniforms.filter_dims.y - 1 - wC / uniforms.dilations.y;
                if (dyC < 0.0 || dyC >= ${H}(uniforms.Dy_shape[${le}]) ||
                    fract(dyC) > 0.0 || wCPerm < 0) {
                  continue;
                }
                let idyC: u32 = u32(dyC);
                var inputChannel = groupId * uniforms.input_channels_per_group;
                ${m?`
                var x_offset = ${se.indicesToOffset(`${se.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${f};
                var w_offset = ${Z.indicesToOffset(`${Z.type.indices}(wRPerm, wCPerm, inputChannel, wOutChannel)`)} / ${w};
                  `:""}
                for (var d2: u32 = 0; d2 < uniforms.input_channels_per_group_int; d2 = d2 + ${m?4:f}) {
                  ${ge()}
                  inputChannel = inputChannel + ${m?4:f};
                }
                ${D()}
                wC = wC + uniforms.strides.y - 1;
              }
              wR = wR + uniforms.strides[0] - 1;
            }
            let value = dotProd${a?` + bias[d1 / ${b}]`:""};
            ${te.setByOffset("global_idx","value")};
          `;return`
    ${L.registerUniforms(J).declareVariables(...Y,te)}
      ${L.mainStart()}
      ${L.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")};
    ${V}}`};return{name:"ConvTranspose2D",shaderCache:{hint:`${t.cacheKey};${f}${w}${b}${m}${_}`,inputDependencies:$},getRunData:()=>({dispatchGroup:{x:v[0],y:v[1],z:v[2]},outputs:[{dims:i?i(n):n,dataType:e[0].dataType}],programUniforms:R}),getShaderSource:M}}}),eu,tu,iu,Gr,cc,ru,Hr,au,fc,Vm=q(()=>{Lm(),Pt(),bt(),eu=(e,t,i,a,n,r)=>(e-1)*t+i+(a-1)*n+1-r,tu=(e,t,i,a,n)=>{let r=Math.floor(e/2);t==="SAME_UPPER"?(i[a]=r,i[n]=e-r):t==="SAME_LOWER"&&(i[a]=e-r,i[n]=r)},iu=(e,t,i,a,n,r,o,u,p,d)=>{let f=e.length-2,m=d.length===0;p.length<f&&p.push(...Array(f-p.length).fill(0));let g=e[0],_=t[u?3:1]*n;for(let b=0,w=e.length-f-(u?1:0);b<f;++b,++w){let C=e[w],v=m?C*o[b]:d[b],$=eu(C,o[b],r[b],t[w],i[b],v);tu($,a,r,b,b+f),m&&d.push(o[b]*(C-1)+p[b]+(t[w]-1)*i[b]+1-r[b]-r[b+f])}d.splice(0,0,g),d.splice(u?3:1,0,_)},Gr=(e,t)=>{let i=e.kernelShape.slice();if(e.kernelShape.length===0||e.kernelShape.reduce((m,g)=>m*g,1)===0){i.length=0;for(let m=2;m<t[1].dims.length;++m)i.push(t[1].dims[m])}let a=e.format==="NHWC";i.splice(0,0,t[1].dims[0]),i.splice(a?3:1,0,t[1].dims[1]);let n=e.pads.slice(),r=e.outputShape.slice(),o=e.outputPadding.slice(),u=t[0].dims,p=e.dilations.slice();if(p.reduce((m,g)=>m+g,0)===0){let m=t[0].dims.length-2;p=new Array(m).fill(1)}let d=e.strides.slice();if(d.reduce((m,g)=>m+g,0)===0){let m=t[0].dims.length-2;d=new Array(m).fill(1)}iu(u,i,p,e.autoPad,e.group,n,d,a,o,r);let f=Object.assign({},e);return Object.assign(f,{kernelShape:i,pads:n,outputPadding:o,outputShape:r,dilations:p,strides:d}),f},cc=e=>{let t=Fa(e),i=e.format,a=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][typeof e.autoPad>"u"?0:e.autoPad],n=e.dilations,r=e.group,o=e.kernelShape,u=e.pads,p=e.strides,d=e.wIsConst(),f=e.outputPadding,m=e.outputShape;return{autoPad:a,format:i,dilations:n,group:r,kernelShape:o,outputPadding:f,outputShape:m,pads:u,strides:p,wIsConst:d,...t,cacheKey:`${e.format};${t.activation};`}},ru=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length!==4&&e[0].dims.length!==3)throw new Error("currently only support 2-dimensional conv");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let i=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],a=e[1].dims[0];if(i!==a)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");let n=e[1].dims[1]*t.group;if(e.length===3&&(e[2].dims.length!==1||e[2].dims[0]!==n))throw new Error("invalid bias");let r=e[0].dims.length-2;if(t.dilations.reduce((o,u)=>o+u,0)>0&&t.dilations.length!==r)throw new Error(`dilations should be ${r}D`);if(t.strides.reduce((o,u)=>o+u,0)>0&&t.strides.length!==r)throw new Error(`strides should be ${r}D`);if(t.pads.reduce((o,u)=>o+u,0)>0&&t.pads.length!==r*2)throw new Error(`pads should be ${r*2}D`);if(t.outputPadding.length!==r&&t.outputPadding.length!==0)throw new Error(`output_padding should be ${r}D`);if(t.kernelShape.reduce((o,u)=>o+u,0)>0&&t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape");if(t.outputShape.length!==0&&t.outputShape.length!==e[0].dims.length-2)throw new Error("invalid output shape")},Hr=(e,t,i,a)=>{let n=e.kernelCustomData.wT??e.compute(qe(t[1],[2,3,0,1]),{inputs:[1],outputs:[i.wIsConst?-2:-1]})[0];i.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=n);let r=[t[0],n];t.length===3&&r.push(t[2]),e.compute(pc(r,i,a),{inputs:r})},au=(e,t)=>{let i=t.format==="NHWC",a=[e.inputs[0].reshape(i?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&a.push(e.inputs[2]);let n=t.kernelShape;(n.length===0||n[0]===0)&&(n=[e.inputs[1].dims[2]]);let r=t.dilations;(r.length===0||r[0]===0)&&(r=[1]);let o=t.strides;(o.length===0||o[0]===0)&&(o=[1]);let u=t.pads;u.length===0&&(u=[0,0]),u=[0,u[0],0,u[1]],o=[1].concat(o),r=[1].concat(r),n=[1].concat(n);let p=t.outputPadding;p=[0].concat(p);let d=Gr({...t,pads:u,strides:o,dilations:r,kernelShape:n,outputPadding:p},a);Hr(e,a,d,f=>i?[f[0],f[2],f[3]]:[f[0],f[1],f[3]])},fc=(e,t)=>{if(ru(e.inputs,t),e.inputs[0].dims.length===3)au(e,t);else{let i=Gr(t,e.inputs);Hr(e,e.inputs,i)}}}),nu,hc,mc,jm=q(()=>{re(),ne(),xe(),oe(),nu=(e,t,i,a)=>{let n=O.size(t),r=t.length,o=N("input",e,r),u=K("output",e,r),p=i.dataType===6?i.getInt32Array()[0]:Number(i.getBigInt64Array()[0]),d=O.normalizeAxis(p,r),f=m=>{let g=` i32(${o.indicesGet("inputIndices","uniforms.axis")}) `,_=X("uniforms.input_shape","uniforms.axis",r),b=a.reverse?g+(a.exclusive?" + 1":""):"0",w=a.reverse?_:g+(a.exclusive?"":" + 1");return`
                ${m.registerUniform("outputSize","u32").registerUniform("axis","u32").declareVariables(o,u)}
                ${m.mainStart()}
                  ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
                  var inputIndices = ${u.offsetToIndices("global_idx")};
                  var sum = ${u.type.value}(0);
                  let first : i32 = ${b};
                  let last : i32 = ${w};
                  for (var i : i32 = first; i < last; i++) {
                    ${o.indicesSet("inputIndices","uniforms.axis","u32(i)")};
                    sum = sum + ${o.getByIndices("inputIndices")};
                  }
                  ${u.setByOffset("global_idx","sum")};
                }`};return{name:"CumSum",shaderCache:{hint:a.cacheKey,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:t,dataType:e}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:[{type:12,data:n},{type:12,data:d},...Q(t,t)]}),getShaderSource:f}},hc=(e,t)=>{let i=e.inputs[0].dims,a=e.inputs[0].dataType,n=e.inputs[1];e.compute(nu(a,i,n,t),{inputs:[0]})},mc=e=>{let t=e.exclusive===1,i=e.reverse===1;return fe({exclusive:t,reverse:i})}}),su,ou,uu,gc,_c,Gm=q(()=>{re(),ne(),xe(),oe(),su=e=>{if(!e||e.length!==1)throw new Error("DepthToSpace requires 1 input.");if(e[0].dims.length!==4)throw new Error("DepthToSpace requires 4D input.")},ou=(e,t,i,a)=>{let n=[];n.push(`fn perm(i: ${a.type.indices}) -> ${i.type.indices} {
    var a: ${i.type.indices};`);for(let r=0;r<t;++r)n.push(i.indicesSet("a",e[r],`i[${r}]`));return n.push("return a;}"),n.join(`
`)},uu=(e,t)=>{let i,a,n,r,o,u,p=t.format==="NHWC",d=t.blocksize,f=t.mode==="DCR";p?([i,a,n,r]=e.dims,o=f?[i,a,n,d,d,r/d**2]:[i,a,n,r/d**2,d,d],u=f?[0,1,3,2,4,5]:[0,1,4,2,5,3]):([i,a,n,r]=[e.dims[0],e.dims[2],e.dims[3],e.dims[1]],o=f?[i,d,d,r/d**2,a,n]:[i,r/d**2,d,d,a,n],u=f?[0,3,4,1,5,2]:[0,1,4,2,5,3]);let m=e.reshape(o),g=m.dims.length,_=e.dataType,b=N("a",_,g),w=K("output",_,g),C=v=>`
  ${v.registerUniform("output_size","u32").declareVariables(b,w)}

  ${ou(u,g,b,w)}

  ${v.mainStart()}
    ${v.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${w.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${w.setByOffset("global_idx",b.getByIndices("aIndices"))}
  }`;return{name:"DepthToSpace",shaderCache:{hint:`${e.dims};${t.blocksize};${t.mode}`,inputDependencies:["rank"]},getRunData:v=>{let $=p?[i,a*d,n*d,r/d**2]:[i,r/d**2,a*d,n*d],T=O.size($),k=m.dims,S=O.sortBasedOnPerm(k,u);return{outputs:[{dims:$,dataType:v[0].dataType}],dispatchGroup:{x:Math.ceil(T/64)},programUniforms:[{type:12,data:T},...Q(k,S)]}},getShaderSource:C}},gc=(e,t)=>{su(e.inputs),e.compute(uu(e.inputs[0],t))},_c=e=>fe({blocksize:e.blocksize,mode:e.mode,format:e.format})}),Ri,ii,Fr,lu,du,pu,cu,Kr,fu,yc,bc,Hm=q(()=>{re(),ne(),xe(),oe(),Ri="[a-zA-Z]|\\.\\.\\.",ii="("+Ri+")+",Fr="^"+ii+"$",lu="("+ii+",)*"+ii,du="^"+lu+"$",pu=class{constructor(e=-1){this.symbolToIndices=new Map,this.inputIndex=e}addSymbol(e,t){let i=this.symbolToIndices.get(e);i===void 0?i=[t]:i.push(t),this.symbolToIndices.set(e,i)}},cu=class{constructor(e,t){var n;this.equation=t,this.hasEllipsis=!1,this.symbolToInfo=new Map,this.lhs=new Array,this.outputDims=[];let[i,a]=t.includes("->")?t.split("->",2):[t,""];if(!i.match(RegExp(du)))throw new Error("Invalid LHS term");if(i.split(",").forEach((r,o)=>{let u=e[o].dims.slice();if(!r.match(RegExp(Fr)))throw new Error("Invalid LHS term");let p=this.processTerm(r,!0,u,o);this.lhs.push(p)}),a==="")a+=[...this.symbolToInfo.entries()].filter(([r,o])=>o.count===1||r==="...").map(([r])=>r).join("");else if(!a.match(RegExp(ii)))throw new Error("Invalid RHS");(n=a.match(RegExp(Ri,"g")))==null||n.forEach(r=>{if(r==="...")this.outputDims=this.outputDims.concat(this.ellipsisDims);else{let o=this.symbolToInfo.get(r);if(o===void 0)throw new Error("Invalid RHS symbol");this.outputDims.push(o.dimValue)}}),this.rhs=this.processTerm(a,!1,this.outputDims)}addSymbol(e,t,i){let a=this.symbolToInfo.get(e);if(a!==void 0){if(a.dimValue!==t&&a.count!==1)throw new Error("Dimension mismatch");a.count++,a.inputIndices.push(i)}else a={count:1,dimValue:t,inputIndices:[i]};this.symbolToInfo.set(e,a)}processTerm(e,t,i,a=-1){let n=i.length,r=!1,o=[],u=0;if(!e.match(RegExp(Fr))&&!t&&e!=="")throw new Error("Invalid LHS term");let p=e.match(RegExp(Ri,"g")),d=new pu(a);return p==null||p.forEach((f,m)=>{if(f==="..."){if(r)throw new Error("Only one ellipsis is allowed per input term");r=!0;let g=n-p.length+1;if(g<0)throw new Error("Ellipsis out of bounds");if(o=i.slice(u,u+g),this.hasEllipsis){if(this.ellipsisDims.length!==o.length||this.ellipsisDims.toString()!==o.toString())throw new Error("Ellipsis dimensions mismatch")}else if(t)this.hasEllipsis=!0,this.ellipsisDims=o;else throw new Error("Ellipsis must be specified in the LHS");for(let _=0;_<o.length;_++){let b=String.fromCharCode(48+_);d.addSymbol(b,m+_),this.addSymbol(b,i[u++],a)}}else d.addSymbol(f,m+(this.hasEllipsis?this.ellipsisDims.length-1:0)),this.addSymbol(f,i[u++],a)}),d}},Kr=e=>e+"_max",fu=(e,t,i,a)=>{let n=e.map(d=>d.length).map((d,f)=>N(`input${f}`,t,d)),r=O.size(a),o=K("output",t,a.length),u=[...i.symbolToInfo.keys()].filter(d=>!i.rhs.symbolToIndices.has(d)),p=d=>{let f=[],m="var prod = 1.0;",g="var sum = 0.0;",_="sum += prod;",b=[],w=[],C=[],v=[],$=i.symbolToInfo.size===i.rhs.symbolToIndices.size;i.symbolToInfo.forEach((k,S)=>{var E;if(i.rhs.symbolToIndices.has(S)){let z=(E=i.rhs.symbolToIndices.get(S))==null?void 0:E[0];z!==void 0&&i.lhs.forEach((R,M)=>{if(k.inputIndices.includes(M)){let L=R.symbolToIndices.get(S);if(L===void 0)throw new Error("Invalid symbol error");L.forEach(J=>{f.push(`${n[M].indicesSet(`input${M}Indices`,J,o.indicesGet("outputIndices",z))}`)})}})}else i.lhs.forEach((z,R)=>{if(k.inputIndices.includes(R)){let M=z.symbolToIndices.get(S);if(M===void 0)throw new Error("Invalid symbol error");M.forEach(L=>{b.push(`${n[R].indicesSet(`input${R}Indices`,L,`${S}`)}`)}),v.push(`prod *= ${n[R].getByIndices(`input${R}Indices`)};`)}}),w.push(`for(var ${S}: u32 = 0; ${S} < uniforms.${Kr(S)}; ${S}++) {`),C.push("}")});let T=$?[...f,`let sum = ${n.map((k,S)=>k.getByIndices(`input${S}Indices`)).join(" * ")};`]:[...f,g,...w,...b,m,...v,_,...C];return`
            ${d.registerUniforms(u.map(k=>({name:`${Kr(k)}`,type:"u32"}))).registerUniform("outputSize","u32").declareVariables(...n,o)}

            ${d.mainStart()}
            ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
            var outputIndices = ${o.offsetToIndices("global_idx")};
            ${n.map((k,S)=>`var input${S}Indices: ${n[S].type.indices};`).join(`
`)}
            ${T.join(`
`)};
            ${o.setByOffset("global_idx","sum")};
          }`};return{name:"Einsum",shaderCache:{hint:i.equation,inputDependencies:e.map(()=>"rank")},getRunData:()=>{let d=u.filter(m=>i.symbolToInfo.has(m)).map(m=>{var g;return{type:12,data:((g=i.symbolToInfo.get(m))==null?void 0:g.dimValue)||0}});d.push({type:12,data:r});let f=e.map((m,g)=>[...Q(m)]).reduce((m,g)=>m.concat(g),d);return f.push(...Q(a)),{outputs:[{dims:a,dataType:t}],dispatchGroup:{x:Math.ceil(r/64)},programUniforms:f}},getShaderSource:p}},yc=(e,t)=>{let i=new cu(e.inputs,t.equation),a=i.outputDims,n=e.inputs.map((r,o)=>r.dims);e.compute(fu(n,e.inputs[0].dataType,i,a))},bc=e=>{let t=e.equation.replace(/\s+/g,"");return fe({equation:t})}}),hu,Zr,mu,gu,wc,Fm=q(()=>{re(),ne(),oe(),hu=e=>{if(!e||e.length!==2)throw new Error("Expand requires 2 input.");let t=e[0].dims,i=Array.from(e[1].getBigInt64Array(),Number),a=i.length<t.length?0:i.length-t.length,n=t.length<i.length?0:t.length-i.length;for(;a<i.length&&n<t.length;++a,++n)if(i[a]!==t[n]&&i[a]!==1&&t[n]!==1)throw new Error("Expand requires shape to be broadcastable to input")},Zr=(e,t)=>{let i=e.length-t.length,a=[];for(let n=0;n<i;++n)a.push(e[n]);for(let n=0;n<t.length;++n)a.push(t[n]===1?e[n+i]:t[n]);return a},mu=(e,t)=>e.length>t.length?Zr(e,t):Zr(t,e),gu=e=>{let t=e[0].dims,i=Array.from(e[1].getBigInt64Array(),Number),a=mu(t,i),n=e[0].dataType,r=n===9||O.size(t)===1,o=n===9||t.length>0&&t[t.length-1]%4===0?4:1,u=r||a.length>0&&a[a.length-1]%4===0?4:1,p=Math.ceil(O.size(a)/u),d=m=>{let g=N("input",n,t.length,o),_=K("output",n,a.length,u),b;if(n===9){let w=(C,v,$="")=>`
          let outputIndices${v} = ${_.offsetToIndices(`outputOffset + ${v}u`)};
          let offset${v} = ${g.broadcastedIndicesToOffset(`outputIndices${v}`,_)};
          let index${v} = offset${v} / 4u;
          let component${v} = offset${v} % 4u;
          ${C}[${v}] = ${$}(${g.getByOffset(`index${v}`)}[component${v}]);
        `;b=`
        let outputOffset = global_idx * ${u};
        var data = vec4<u32>(0);
        ${w("data",0,"u32")}
        ${w("data",1,"u32")}
        ${w("data",2,"u32")}
        ${w("data",3,"u32")}
        ${_.setByOffset("global_idx","data")}
      }`}else b=`
        let outputIndices = ${_.offsetToIndices(`global_idx * ${u}`)};
        let inputOffset = ${g.broadcastedIndicesToOffset("outputIndices",_)};
        let data = ${_.type.value}(${g.getByOffset(`inputOffset / ${o}`)});
        ${_.setByOffset("global_idx","data")}
      }`;return`
    ${m.registerUniform("vec_size","u32").declareVariables(g,_)}
    ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
    ${b}`},f=[{type:12,data:p},...Q(t,a)];return{name:"Expand",shaderCache:{hint:`${a.length};${o}${u}`,inputDependencies:["rank"]},getShaderSource:d,getRunData:()=>({outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:f})}},wc=e=>{hu(e.inputs),e.compute(gu(e.inputs),{inputs:[0]})}}),_u,$c,Km=q(()=>{re(),ne(),oe(),Ha(),_u=e=>{let t=e[0].dataType,i=O.size(e[0].dims),a=O.size(e[1].dims),n=a%4===0,r=o=>{let u=N("x",t,[1],4),p=N("bias",t,[1],4),d=K("y",t,[1],4),f=[{name:"output_vec_size",type:"u32"},{name:"bias_size",type:"u32"}],m=_=>`
      let bias${_}_offset: u32 = (global_idx * 4 + ${_}) % uniforms.bias_size;
      let bias${_} = ${p.getByOffset(`bias${_}_offset / 4`)}[bias${_}_offset % 4];`,g=n?`
      let bias = ${p.getByOffset("global_idx % (uniforms.bias_size / 4)")};`:`${m(0)}${m(1)}${m(2)}${m(3)}
      let bias = ${u.type.value}(bias0, bias1, bias2, bias3);`;return`${o.registerUniforms(f).declareVariables(u,p,d)}

    ${va(ze(t))}

    ${o.mainStart(jt)}
      ${o.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_vec_size")}

      let x = ${u.getByOffset("global_idx")};
      ${g}
      let x_in = x + bias;
      ${d.setByOffset("global_idx",xa("x_in"))}
    }`};return{name:"FastGeluWithBias",shaderCache:{hint:`${n}`,inputDependencies:["type","type"]},getShaderSource:r,getRunData:o=>({outputs:[{dims:o[0].dims,dataType:o[0].dataType}],programUniforms:[{type:12,data:Math.ceil(i/4)},{type:12,data:a}],dispatchGroup:{x:Math.ceil(i/jt/4)}})}},$c=e=>{e.inputs.length<2||O.size(e.inputs[1].dims)===0?Wp(e):e.compute(_u(e.inputs))}}),yu,bu,vc,xc,Zm=q(()=>{re(),ne(),xe(),oe(),yu=e=>{if(!e||e.length!==2)throw new Error("Gather requires 2 inputs.")},bu=(e,t)=>{let i=e[0].dims,a=e[1].dims,n=i.length,r=O.normalizeAxis(t.axis,n),o=i.slice(0);o.splice(r,1,...a);let u=i[r],p=e[0].dataType===9?4:1,d=Math.ceil(O.size(o)/p),f=[{type:12,data:d},{type:6,data:u},{type:12,data:r},...Q(e[0].dims,e[1].dims,o)],m=g=>{let _=N("data",e[0].dataType,e[0].dims.length,p),b=N("inputIndices",e[1].dataType,e[1].dims.length),w=K("output",e[0].dataType,o.length,p),C=$=>{let T=a.length,k=`var indicesIndices${$}  = ${b.type.indices}(0);`;for(let S=0;S<T;S++)k+=`${T>1?`indicesIndices${$}[${S}]`:`indicesIndices${$}`} = ${o.length>1?`outputIndices${$}[uniforms.axis + ${S}]`:`outputIndices${$}`};`;k+=`
          var idx${$} = ${b.getByIndices(`indicesIndices${$}`)};
          if (idx${$} < 0) {
            idx${$} = idx${$} + uniforms.axisDimLimit;
          }
          var dataIndices${$} : ${_.type.indices};
        `;for(let S=0,E=0;S<n;S++)S===r?(k+=`${n>1?`dataIndices${$}[${S}]`:`dataIndices${$}`} = u32(idx${$});`,E+=T):(k+=`${n>1?`dataIndices${$}[${S}]`:`dataIndices${$}`} = ${o.length>1?`outputIndices${$}[${E}]`:`outputIndices${$}`};`,E++);return k},v;if(e[0].dataType===9){let $=(T,k,S="")=>`
          let outputIndices${k} = ${w.offsetToIndices(`outputOffset + ${k}u`)};
          ${C(k)};
          let offset${k} = ${_.indicesToOffset(`dataIndices${k}`)};
          let index${k} = offset${k} / 4u;
          let component${k} = offset${k} % 4u;
          ${T}[${k}] = ${S}(${_.getByOffset(`index${k}`)}[component${k}]);
        `;v=`
        let outputOffset = global_idx * ${p};
        var value = vec4<u32>(0);
        ${$("value",0,"u32")}
        ${$("value",1,"u32")}
        ${$("value",2,"u32")}
        ${$("value",3,"u32")}
        ${w.setByOffset("global_idx","value")}
      `}else v=`
      let outputIndices = ${w.offsetToIndices("global_idx")};
      ${C("")};
      let value = ${_.getByIndices("dataIndices")};
      ${w.setByOffset("global_idx","value")};
      `;return`
      ${g.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(_,b,w)}
      ${g.mainStart()}
        ${g.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        ${v}
      }`};return{name:"Gather",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:f}),getShaderSource:m}},vc=e=>fe({axis:e.axis}),xc=(e,t)=>{let i=e.inputs;yu(i),e.compute(bu(e.inputs,t))}}),wu,Cc,Tc,Ym=q(()=>{re(),ne(),oe(),wu=(e,t,i,a,n,r,o,u,p)=>{let d=[{type:12,data:r},{type:12,data:a},{type:12,data:n},{type:12,data:i},{type:12,data:o},{type:12,data:u},{type:12,data:p}],f=[r];d.push(...Q(t.dims,f));let m=g=>{let _=N("indices_data",t.dataType,t.dims.length),b=K("input_slice_offsets_data",12,1,1),w=[_,b],C=[{name:"output_size",type:"u32"},{name:"batch_dims",type:"u32"},{name:"input_dims",type:"u32",length:n.length},{name:"sizes_from_slice_dims_data",type:"u32",length:i.length},{name:"num_slices_per_batch",type:"u32"},{name:"input_batch_stride",type:"u32"},{name:"num_slice_dims",type:"u32"}];return`
  ${g.registerUniforms(C).declareVariables(...w)}
  ${g.mainStart()}
    ${g.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let batch_idx = global_idx / uniforms.num_slices_per_batch;
    let base_offset = batch_idx * uniforms.input_batch_stride;

    let slice_indices_base_offset = global_idx * uniforms.num_slice_dims;
    var relative_slice_offset = 0;
    for (var dim_idx = 0u; dim_idx < uniforms.num_slice_dims; dim_idx ++) {
      var index = i32(indices_data[dim_idx + slice_indices_base_offset].x);
      let input_dim_idx = uniforms.batch_dims + dim_idx;
      if (index < 0) {
        ${n.length===1?"index += i32(uniforms.input_dims);":"index += i32(uniforms.input_dims[input_dim_idx]);"}
      }
      ${i.length===1?"relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data);":"relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data[dim_idx]);"}
    }

    input_slice_offsets_data[global_idx] =  base_offset + u32(relative_slice_offset);
  }`};return e.compute({name:"computeSliceOffsets",shaderCache:{hint:`${n.length}_${i.length}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:f,dataType:e.inputs[1].dataType}],dispatchGroup:{x:Math.ceil(r/64)},programUniforms:d}),getShaderSource:m},{inputs:[t],outputs:[-1]})[0]},Cc=(e,t)=>{let i=e.inputs,a=i[0].dims,n=i[0].dataType,r=i[1].dims,o=r[r.length-1],u=O.sizeToDimension(r,r.length-1),p=O.sizeFromDimension(a,t.batchDims+o),d=O.sizeToDimension(a,t.batchDims),f=O.sizeFromDimension(a,t.batchDims),m=u/d,g=new Array(o),_=p;for(let k=0;k<o;++k)g[o-1-k]=_,_*=a[t.batchDims+o-1-k];let b=wu(e,i[1],g,t.batchDims,a,u,m,f,o),w=t.batchDims+o;if(w>a.length)throw new Error("last dimension of indices must not be larger than rank of input tensor");let C=r.slice(0,-1).concat(a.slice(w)),v=O.size(C),$=[{type:12,data:v},{type:12,data:p},...Q(i[0].dims,b.dims,C)],T=k=>{let S=N("data",i[0].dataType,i[0].dims.length),E=N("slice_offsets",12,b.dims.length),z=K("output",i[0].dataType,C.length);return`
          ${k.registerUniform("output_size","u32").registerUniform("slice_size","u32").declareVariables(S,E,z)}
            ${k.mainStart()}
            ${k.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let slice_offset = slice_offsets[global_idx / uniforms.slice_size];
          output[global_idx] = data[u32(slice_offset) + global_idx % uniforms.slice_size];
        }`};e.compute({name:"GatherND",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:C,dataType:n}],dispatchGroup:{x:Math.ceil(v/64)},programUniforms:$}),getShaderSource:T},{inputs:[i[0],b]})},Tc=e=>({batchDims:e.batch_dims,cacheKey:""})}),$u,vu,kc,Sc,Xm=q(()=>{re(),ne(),xe(),oe(),$u=(e,t)=>{if(e.length<3||e.length>4)throw new Error("GatherBlockQuantized requires 3 or 4 inputs.");let i=O.normalizeAxis(t.quantizeAxis,e[0].dims.length),a=t.blockSize,n=e[0],r=e[2],o=e.length===4?e[3]:void 0;if(r.dims.length!==n.dims.length||!n.dims.map((u,p)=>p===i?Math.ceil(u/a)===r.dims[p]:u===r.dims[p]).reduce((u,p)=>u&&p,!0))throw new Error("Scales must have the same rank as the input tensor and the dims should match except on gatherAxis.");if(o){if(o.dataType!==n.dataType)throw new Error("Zero point must have the same data type as the input tensor.");if(o.dims.length!==r.dims.length||!o.dims.map((u,p)=>u===r.dims[p]).reduce((u,p)=>u&&p,!0))throw new Error("Zero point must have the same rank as the input tensor and the dims should match except on quantizeAxis.")}},vu=(e,t)=>{let i=e[0].dims,a=e[1].dims,n=i.length,r=O.normalizeAxis(t.gatherAxis,n),o=O.normalizeAxis(t.quantizeAxis,n),u=i.slice(0);u.splice(r,1,...a);let p=O.size(u),d=e[2].dataType,f=e[0].dataType===22,m=[{type:12,data:p},{type:12,data:o},{type:12,data:r},{type:12,data:t.blockSize},...Q(...e.map((_,b)=>_.dims),u)],g=_=>{let b=N("data",e[0].dataType,e[0].dims.length),w=N("inputIndices",e[1].dataType,e[1].dims.length),C=N("scales",e[2].dataType,e[2].dims.length),v=e.length>3?N("zeroPoint",e[3].dataType,e[3].dims.length):void 0,$=K("output",d,u.length),T=[b,w,C];v&&T.push(v);let k=[{name:"output_size",type:"u32"},{name:"quantize_axis",type:"u32"},{name:"gather_axis",type:"u32"},{name:"block_size",type:"u32"}];return`
        ${_.registerUniforms(k).declareVariables(...T,$)}
        ${_.mainStart()}
        let output_indices = ${$.offsetToIndices("global_idx")};
        var indices_indices = ${w.type.indices}(0);
        ${a.length>1?`
          for (var i: u32 = 0; i < ${a.length}; i++) {
            let index = ${$.indicesGet("output_indices","uniforms.gather_axis + i")};
            ${w.indicesSet("indices_indices","i","index")};
          }`:`indices_indices = ${$.indicesGet("output_indices","uniforms.gather_axis")};`};
        var data_indices = ${b.type.indices}(0);
        for (var i: u32 = 0; i < uniforms.gather_axis; i++) {
          let index = ${$.indicesGet("output_indices","i")};
          ${b.indicesSet("data_indices","i","index")};
        }
        var index_from_indices = ${w.getByIndices("indices_indices")};
        if (index_from_indices < 0) {
          index_from_indices += ${i[r]};
        }
        ${b.indicesSet("data_indices","uniforms.gather_axis","u32(index_from_indices)")};
        for (var i = uniforms.gather_axis + 1; i < ${u.length}; i++) {
          let index = ${$.indicesGet("output_indices",`i + ${a.length} - 1`)};
          ${b.indicesSet("data_indices","i","index")};
        }
        let data_offset = ${b.indicesToOffset("data_indices")};
        let data_index = data_offset % 8;
        // Convert 4-bit packed data to 8-bit packed data.
        let packed_4bit_quantized_data = ${b.getByOffset("data_offset / 8")};
        let packed_8bit_quantized_data = (packed_4bit_quantized_data >> (4 * (data_index % 2))) & 0x0f0f0f0f;
        let quantized_data_vec = ${f?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_quantized_data));
        let quantized_data = quantized_data_vec[data_index / 2];
        var scale_indices = data_indices;
        let quantize_axis_index = ${C.indicesGet("data_indices","uniforms.quantize_axis")} / uniforms.block_size;
        ${C.indicesSet("scale_indices","uniforms.quantize_axis","quantize_axis_index")};
        var scale = ${C.getByIndices("scale_indices")};
        ${v?`
              let zero_point_indices = scale_indices;
              let zero_point_offset = ${v.indicesToOffset("zero_point_indices")};
              let zero_point_index = zero_point_offset % 8;
              let packed_4bit_zero_points = ${v.getByOffset("zero_point_offset / 8")};
              let packed_8bit_zero_points = (packed_4bit_zero_points >> (4 * (zero_point_index % 2))) & 0x0f0f0f0f;
              let zero_point_vec = ${f?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_zero_points));
              let zero_point = zero_point_vec[zero_point_index / 2];`:"var zero_point = 0"};
        let dequantized_data = ${ze(d)}(quantized_data - zero_point) * scale;
        ${$.setByOffset("global_idx","dequantized_data")};
    }`};return{name:"GatherBlockQuantized",shaderCache:{hint:`${t.cacheKey};${e.filter((_,b)=>b!==1).map(_=>_.dims.join("_")).join(";")}`,inputDependencies:Array.from({length:e.length},(_,b)=>"rank")},getRunData:()=>({outputs:[{dims:u,dataType:d}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:m}),getShaderSource:g}},kc=(e,t)=>{let i=e.inputs;$u(i,t),e.compute(vu(e.inputs,t))},Sc=e=>fe({blockSize:e.blockSize,gatherAxis:e.gatherAxis,quantizeAxis:e.quantizeAxis})}),xu,Cu,Ic,Ec,Qm=q(()=>{re(),ne(),xe(),oe(),xu=e=>{if(!e||e.length!==2)throw new Error("GatherElements requires 2 inputs.");if(e[0].dims.length<1)throw new Error("GatherElements requires that the data input be rank >= 1.");if(e[0].dims.length!==e[1].dims.length)throw new Error(`GatherElements requires that the data input and
                     indices input tensors be of same rank.`)},Cu=(e,t)=>{let i=e[0].dims,a=e[0].dataType,n=i.length,r=e[1].dims,o=e[1].dataType,u=O.normalizeAxis(t.axis,n),p=i[u],d=r.slice(0),f=O.size(d),m=N("input",a,n),g=N("indicesInput",o,r.length),_=K("output",a,d.length),b=[{type:12,data:f},{type:6,data:p},{type:12,data:u}];return b.push(...Q(i,r,d)),{name:"GatherElements",shaderCache:{inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:d,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:b}),getShaderSource:w=>`
      ${w.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(m,g,_)}
      ${w.mainStart()}
      ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

      let outputIndices = ${_.offsetToIndices("global_idx")};

      var idx = ${g.getByOffset("global_idx")};
      if (idx < 0) {
        idx = idx + uniforms.axisDimLimit;
      }
      var inputIndices = ${m.type.indices}(outputIndices);
      ${m.indicesSet("inputIndices","uniforms.axis","u32(idx)")};
      let value = ${m.getByIndices("inputIndices")};

      ${_.setByOffset("global_idx","value")};
  }`}},Ic=e=>fe({axis:e.axis}),Ec=(e,t)=>{let i=e.inputs;xu(i),e.compute(Cu(e.inputs,t))}}),Tu,ku,zc,Ac,Jm=q(()=>{re(),ne(),oe(),Tu=e=>{if(!e)throw new Error("Input is missing");if(e.length<2||e.length>3)throw new Error("Invaid input number.");if(e.length===3&&e[2].dims.length>2)throw new Error("Invalid input shape of C");if(e[0].dataType!==e[1].dataType||e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("Input types are mismatched")},ku=(e,t)=>{let i=e[0].dims.slice(),a=e[1].dims.slice(),[n,r,o]=Id.getShapeOfGemmResult(i,t.transA,a,t.transB,e.length===3?e[2].dims:void 0),u=[n,r];if(!u)throw new Error("Can't use gemm on the given tensors");let p=16,d=Math.ceil(r/p),f=Math.ceil(n/p),m=!0,g=O.size(u),_=[{type:12,data:m?d:g},{type:12,data:n},{type:12,data:r},{type:12,data:o},{type:1,data:t.alpha},{type:1,data:t.beta}],b=["type","type"];e.length===3&&(_.push(...Q(e[2].dims)),b.push("rank")),_.push(...Q(u));let w=v=>{let $="";t.transA&&t.transB?$="value += a[k * uniforms.M + m] * b[n * uniforms.K + k];":t.transA&&!t.transB?$="value += a[k * uniforms.M + m] * b[k * uniforms.N + n];":!t.transA&&t.transB?$="value += a[m * uniforms.K + k] * b[n * uniforms.K + k];":!t.transA&&!t.transB&&($="value += a[m * uniforms.K + k] * b[k * uniforms.N + n];");let T=t.alpha===1?"":"value *= uniforms.alpha;",k=N("a",e[0].dataType,e[0].dims),S=N("b",e[1].dataType,e[1].dims),E=k.type.value,z=null,R=[k,S];e.length===3&&(z=N("c",e[2].dataType,e[2].dims.length),R.push(z));let M=K("output",e[0].dataType,u.length);R.push(M);let L=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}];return`
  ${v.registerUniforms(L).declareVariables(...R)}

  ${v.mainStart()}
    ${v.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let m = global_idx / uniforms.N;
    let n = global_idx % uniforms.N;

    var value = ${E}(0);
    for (var k: u32 = 0u; k < uniforms.K; k++) {
      ${$}
    }

    ${T}
    ${z!=null?`let cOffset = ${z.broadcastedIndicesToOffset("vec2(m, n)",M)}; value += ${E}(uniforms.beta) * ${z.getByOffset("cOffset")};`:""}
    output[global_idx] = value;
  }`},C=v=>{let $=N("a",e[0].dataType,e[0].dims),T=N("b",e[1].dataType,e[1].dims),k=null,S=[$,T];e.length===3&&(k=N("c",e[2].dataType,e[2].dims.length),S.push(k));let E=K("output",e[0].dataType,u.length);S.push(E);let z=[{name:"num_tile_n",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}],R="",M="";t.transA&&t.transB?(M=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${$.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${T.type.value}(0);
      }
      `,R="value += tile_a[k][local_id.y] * tile_b[local_id.x][k];"):t.transA&&!t.transB?(M=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${$.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${T.type.value}(0);
      }
      `,R="value += tile_a[k][local_id.y] * tile_b[k][local_id.x];"):!t.transA&&t.transB?(M=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${$.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${T.type.value}(0);
      }
      `,R="value += tile_a[local_id.y][k] * tile_b[local_id.x][k];"):!t.transA&&!t.transB&&(M=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${$.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${T.type.value}(0);
      }
      `,R="value += tile_a[local_id.y][k] * tile_b[k][local_id.x];");let L=t.alpha===1?"":"value *= uniforms.alpha;";return`
  ${v.registerUniforms(z).declareVariables(...S)}
  var<workgroup> tile_a: array<array<${$.type.storage}, ${p}>, ${p}>;
  var<workgroup> tile_b: array<array<${T.type.storage}, ${p}>, ${p}>;
  ${v.mainStart([p,p,1])}
    let tile_col_start = (workgroup_index % uniforms.num_tile_n) * ${p};
    let tile_row_start = (workgroup_index / uniforms.num_tile_n) * ${p};
    let num_tiles = (uniforms.K - 1) / ${p} + 1;
    var k_start = 0u;
    var value = ${E.type.value}(0);
    for (var t: u32 = 0u; t < num_tiles; t++) {
      ${M}
      k_start = k_start + ${p};
      workgroupBarrier();

      for (var k: u32 = 0u; k < ${p}; k++) {
        ${R}
      }
      workgroupBarrier();
    }

    ${L}
    let m = tile_row_start + local_id.y;
    let n = tile_col_start + local_id.x;
    ${k!=null?`let cOffset = ${k.broadcastedIndicesToOffset("vec2(m, n)",E)}; value += ${E.type.value}(uniforms.beta) * ${k.getByOffset("cOffset")};`:""}
    if (m < uniforms.M && n < uniforms.N) {
      output[m * uniforms.N + n] = value;
    }
  }`};return m?{name:"GemmShared",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:b},getRunData:()=>({outputs:[{dims:u,dataType:e[0].dataType}],dispatchGroup:{x:d*f},programUniforms:_}),getShaderSource:C}:{name:"Gemm",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:b},getRunData:()=>({outputs:[{dims:u,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(g/64)},programUniforms:_}),getShaderSource:w}},zc=e=>{let t=e.transA,i=e.transB,a=e.alpha,n=e.beta;return{transA:t,transB:i,alpha:a,beta:n,cacheKey:`${e.transA};${e.transB};${e.alpha===1}`}},Ac=(e,t)=>{Tu(e.inputs),e.compute(ku(e.inputs,t))}}),Je,ot,Tt,kt,Su,Iu,Eu,zu,Au,Ou,Ru,Bu,Oc,Rc,eg=q(()=>{re(),ne(),xe(),oe(),[Je,ot,Tt,kt]=[0,1,2,3],Su=e=>{if(e[0].dims.length!==4)throw new Error("only 4-D tensor is supported.");if(e[0].dims.length!==e[1].dims.length)throw new Error("input dimensions must be equal to grid dimensions");if(e[0].dims.length-2!==e[1].dims[e[1].dims.length-1])throw new Error(`last dimension of grid must be equal to ${e[0].dims.length-2}`);if(e[0].dims[0]!==e[1].dims[0])throw new Error("grid batch size must match input batch size")},Iu=`
  fn gs_get_cubic_coeffs(x: f32) -> vec4<f32> {
    let cubic_alpha = -0.75f;
    let x_abs = abs(x);
    var coeffs: vec4<f32>;
    coeffs[0] = (((cubic_alpha * (x_abs + 1) - 5 * cubic_alpha) * (x_abs + 1) + 8 * cubic_alpha) * (x_abs + 1) - 4 * cubic_alpha);
    coeffs[1] = (((cubic_alpha + 2) * x_abs - (cubic_alpha + 3)) * x_abs * x_abs + 1);
    coeffs[2] = (((cubic_alpha + 2) * (1 - x_abs) - (cubic_alpha + 3)) * (1 - x_abs) * (1 - x_abs) + 1);
    coeffs[3] = (((cubic_alpha * (2 - x_abs) - 5 * cubic_alpha) * (2 - x_abs) + 8 * cubic_alpha) * (2 - x_abs) - 4 * cubic_alpha);
    return coeffs;
  }
`,Eu=e=>`
  fn gs_bicubic_interpolate(p: mat4x4<${e}>, x: f32, y: f32) -> ${e} {
    var v: vec4<f32>;
    var coeffs = gs_get_cubic_coeffs(x);
    for (var i = 0; i < 4; i++) {
      v[i] = coeffs[0] * p[i][0] + coeffs[1] * p[i][1] + coeffs[2] * p[i][2] + coeffs[3] * p[i][3];
    }
    coeffs = gs_get_cubic_coeffs(y);
    let pixel = ${e}(coeffs[0] * v[0] + coeffs[1] * v[1] + coeffs[2] * v[2] + coeffs[3] * v[3]);
    return pixel;
  }
`,zu=e=>`
  fn gs_denormalize(n: f32, length: i32) -> f32 {
    ${e.alignCorners===0?`
    // alignCorners: false => [-1, 1] to [-0.5, length - 0.5]
    return ((n + 1.0) * f32(length) - 1.0) / 2.0;
    `:`
    // alignCorners: true => [-1, 1] to [0, length - 1]
    return (n + 1.0) / 2.0 * (f32(length - 1));
    `}
  }
`,Au=e=>`
  ${e.paddingMode==="reflection"?`
      fn gs_reflect(x: i32, x_min: f32, x_max: f32) -> u32 {
        var dx = 0.0;
        var fx = f32(x);
        let range = x_max - x_min;
        if (fx < x_min) {
          dx = x_min - fx;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_min + r;
          } else {
            fx = x_max - r;
          }
        } else if (fx > x_max) {
          dx = fx - x_max;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_max - r;
          } else {
            fx = x_min + r;
          }
        }
        return u32(fx);
      }`:""}
`,Ou=(e,t,i)=>`
  fn pixel_at_grid(r: i32, c: i32, H: i32, W: i32, batch: u32, channel: u32, border: vec4<f32>) -> ${t} {
     var pixel = ${t}(0);
     var indices = vec4<u32>(0);
     indices[${Je}] = batch;
     indices[${ot}] = channel;`+(()=>{switch(i.paddingMode){case"zeros":return`
          if (r >= 0 && r < H && c >=0 && c < W) {
            indices[${Tt}] = u32(r);
            indices[${kt}] = u32(c);
          } else {
            return ${t}(0);
          }
        `;case"border":return`
          indices[${Tt}] = u32(clamp(r, 0, H - 1));
          indices[${kt}] = u32(clamp(c, 0, W - 1));
        `;case"reflection":return`
          indices[${Tt}] = gs_reflect(r, border[1], border[3]);
          indices[${kt}] = gs_reflect(c, border[0], border[2]);
        `;default:throw new Error(`padding mode ${i.paddingMode} is not supported`)}})()+`
    return ${e.getByIndices("indices")};
  }
`,Ru=(e,t,i)=>(()=>{switch(i.mode){case"nearest":return`
          let result = pixel_at_grid(i32(round(y)), i32(round(x)), H_in, W_in, indices[${Je}], indices[${ot}], border);
        `;case"bilinear":return`
          let x1 = i32(floor(x));
          let y1 = i32(floor(y));
          let x2 = x1 + 1;
          let y2 = y1 + 1;

          let p11 = pixel_at_grid(y1, x1, H_in, W_in, indices[${Je}], indices[${ot}], border);
          let p12 = pixel_at_grid(y1, x2, H_in, W_in, indices[${Je}], indices[${ot}], border);
          let p21 = pixel_at_grid(y2, x1, H_in, W_in, indices[${Je}], indices[${ot}], border);
          let p22 = pixel_at_grid(y2, x2, H_in, W_in, indices[${Je}], indices[${ot}], border);

          let dx2 = ${t}(f32(x2) - x);
          let dx1 = ${t}(x - f32(x1));
          let dy2 = ${t}(f32(y2) - y);
          let dy1 = ${t}(y - f32(y1));
          let result = dy2 * (dx2 * p11 + dx1 * p12) + dy1 * (dx2 * p21 + dx1 * p22);
        `;case"bicubic":return`
          let x0 = i32(floor(x)) - 1;
          let y0 = i32(floor(y)) - 1;
          var p: mat4x4<${t}>;
          for (var h = 0; h < 4; h++) {
            for (var w = 0; w < 4; w++) {
              p[h][w] = pixel_at_grid(h + y0, w + x0, H_in, W_in, indices[${Je}], indices[${ot}], border);
            }
          }

          let dx = x - f32(x0 + 1);
          let dy = y - f32(y0 + 1);
          let result = gs_bicubic_interpolate(p, dx, dy);
        `;default:throw new Error(`mode ${i.mode} is not supported`)}})()+`${e.setByOffset("global_idx","result")}`,Bu=(e,t)=>{let i=N("x",e[0].dataType,e[0].dims.length),a=[e[1].dims[0],e[1].dims[1],e[1].dims[2]],n=N("grid",e[1].dataType,a.length,2),r=[e[0].dims[0],e[0].dims[1],e[1].dims[1],e[1].dims[2]];t.format==="NHWC"&&(r=[e[0].dims[0],e[1].dims[1],e[1].dims[2],e[0].dims[3]],[Je,ot,Tt,kt]=[0,3,1,2]);let o=K("output",e[0].dataType,r.length),u=i.type.value,p=O.size(r),d=[{type:12,data:p},...Q(e[0].dims,a,r)],f=m=>`
  ${m.registerUniform("output_size","u32").declareVariables(i,n,o)}
  ${Iu}
  ${Eu(u)}
  ${zu(t)}
  ${Au(t)}
  ${Ou(i,u,t)}

  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let H_in = i32(uniforms.x_shape[${Tt}]);
      let W_in = i32(uniforms.x_shape[${kt}]);

      ${t.alignCorners===0?`
      let x_min = -0.5;
      let x_max = f32(W_in) - 0.5;
      let y_min = -0.5;
      let y_max = f32(H_in) - 0.5;
      `:`
      let x_min = 0.0;
      let x_max = f32(W_in) - 1.0;
      let y_min = 0.0;
      let y_max = f32(H_in) - 1.0;
      `};
      let border = vec4<f32>(x_min, y_min, x_max, y_max);

      let indices = ${o.offsetToIndices("global_idx")};
      var grid_indices = vec3<u32>(indices[${Je}], indices[${Tt}], indices[${kt}]);
      let nxy = ${n.getByIndices("grid_indices")};
      var x = gs_denormalize(f32(nxy[0]), W_in);
      var y = gs_denormalize(f32(nxy[1]), H_in);

      ${Ru(o,u,t)}
  }`;return{name:"GridSample",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:["type","type"]},getRunData:m=>{let g=O.size(r);return{outputs:[{dims:r,dataType:m[0].dataType}],dispatchGroup:{x:Math.ceil(g/64)},programUniforms:d}},getShaderSource:f}},Oc=(e,t)=>{Su(e.inputs),e.compute(Bu(e.inputs,t))},Rc=e=>fe({alignCorners:e.align_corners,mode:e.mode,paddingMode:e.padding_mode,format:e.format})}),Re,Nu,Bc,Yr,Du,di,Nc,Dc=q(()=>{re(),ne(),xe(),La(),Ga(),oe(),bt(),Re=(e,t)=>e.length>t&&e[t].dims.length>0?e[t]:void 0,Nu=(e,t)=>{let i=e[0],a=Re(e,1),n=Re(e,2),r=Re(e,3),o=Re(e,4),u=Re(e,5),p=Re(e,6),d=Re(e,7);if(i.dims.length!==3&&i.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let f=i.dims[0],m=i.dims[1],g=i.dims.length===3?i.dims[2]:t.numHeads*i.dims[4],_=m,b=0,w=0,C=Math.floor(g/t.numHeads);if(p&&d&&O.size(p.dims)&&O.size(d.dims)){if(p.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(p.dims[0]!==f||p.dims[1]!==t.numHeads||p.dims[3]!==C)throw new Error('Input "past_key" shape (batch_size, num_heads, past_sequence_length, head_size)');if(d.dims[0]!==f||d.dims[1]!==t.numHeads||d.dims[3]!==C)throw new Error('Input "past_value" shape (batch_size, num_heads, past_sequence_length, head_size)');if(p.dims[2]!==d.dims[2])throw new Error('Input "past_key" and "past_value" shall have same dim 2 (past_sequence_length)');if(d.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');b=p.dims[2],w=p.dims[2]}else if(p&&O.size(p.dims)||d&&O.size(d.dims))throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let v;if(a&&O.size(a.dims)>0){if(i.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(a.dims.length<3||a.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(i.dims[0]!==a.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(a.dims.length===3){if(a.dims[2]!==i.dims[2])throw new Error('Input "query" and "key" shall have same dim 2 (hidden_size)');v=2,_=a.dims[1]}else if(a.dims.length===5){if(a.dims[2]!==t.numHeads||a.dims[3]!==2||a.dims[4]!==C)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(n)throw new Error('Expect "value" be none when "key" has packed kv format.');v=5,_=a.dims[1]}else{if(a.dims[1]!==t.numHeads||a.dims[3]!==C)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');v=0,_=a.dims[2]}}else{if(i.dims.length!==5)throw new Error('Input "query" is expected to have 5 dimensions when key is empty');if(i.dims[2]!==t.numHeads||i.dims[3]!==3)throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');v=3}if(r&&O.size(r.dims)>0){if(r.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimension');if(a&&a.dims.length===5&&a.dims[3]===2)throw new Error("bias is not allowed for packed kv.")}let $=b+_,T=0;if(o&&O.size(o.dims)>0){T=8;let z=o.dims;throw z.length===1?z[0]===f?T=1:z[0]===3*f+2&&(T=3):z.length===2&&z[0]===f&&z[1]===$&&(T=5),T===8?new Error('Input "key_padding_mask" shape shall be (batch_size) or (batch_size, total_sequence_length)'):new Error("Mask not supported")}let k=!1,S=g;if(n&&O.size(n.dims)>0){if(n.dims.length!==3&&n.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(i.dims[0]!==n.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(n.dims.length===3){if(_!==n.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');S=n.dims[2]}else{if(_!==n.dims[2])throw new Error('Input "key" and "value" shall have the same dim 2 (kv_sequence_length)');S=n.dims[1]*n.dims[3],k=!0}}let E=!1;if(o&&O.size(o.dims)>0)throw new Error("Key padding mask is not supported");if(u&&O.size(u.dims)>0){if(u.dims.length!==4)throw new Error('Input "attention_bias" is expected to have 4 dimensions');if(u.dims[0]!==f||u.dims[1]!==t.numHeads||u.dims[2]!==m||u.dims[3]!==$)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:f,sequenceLength:m,pastSequenceLength:b,kvSequenceLength:_,totalSequenceLength:$,maxSequenceLength:w,inputHiddenSize:0,hiddenSize:g,vHiddenSize:S,headSize:C,vHeadSize:Math.floor(S/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:T,scale:t.scale,broadcastResPosBias:E,passPastInKv:k,qkvFormat:v}},Bc=e=>fe({...e}),Yr=fe({perm:[0,2,1,3]}),Du=(e,t,i,a,n,r,o)=>{let u=[a,n,r],p=O.size(u),d=[{type:12,data:p},{type:12,data:o},{type:12,data:r}],f=m=>{let g=K("qkv_with_bias",t.dataType,u),_=N("qkv",t.dataType,u),b=N("bias",i.dataType,u),w=[{name:"output_size",type:"u32"},{name:"bias_offset",type:"u32"},{name:"hidden_size",type:"u32"}];return`
  ${m.registerUniforms(w).declareVariables(_,b,g)}
  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let bias_offset_idx = (global_idx % uniforms.hidden_size) + uniforms.bias_offset;

    qkv_with_bias[global_idx] = qkv[global_idx] + bias[bias_offset_idx];
  }`};return e.compute({name:"MultiHeadAttentionAddBias",shaderCache:{inputDependencies:["type","type"]},getRunData:()=>({outputs:[{dims:u,dataType:t.dataType,gpuDataType:0}],dispatchGroup:{x:Math.ceil(p/64)},programUniforms:d}),getShaderSource:f},{inputs:[t,i],outputs:[-1]})[0]},di=(e,t,i,a,n,r,o,u)=>{let p=r;if(o&&O.size(o.dims)>0){if(a===1)throw new Error("AddBiasReshape is not implemented. Please export your model with packed QKV or KV");return p=Du(e,r,o,t,a,i*n,u),p=p.reshape([t,a,i,n]),i===1||a===1?p:e.compute(qe(p,Yr.perm),{inputs:[p],outputs:[-1]})[0]}else return r.dims.length===3&&(p=r.reshape([t,a,i,n])),i===1||a===1?p:e.compute(qe(p,Yr.perm),{inputs:[p],outputs:[-1]})[0]},Nc=(e,t)=>{let i=Nu(e.inputs,t),a=e.inputs[0],n=Re(e.inputs,1),r=Re(e.inputs,2),o=Re(e.inputs,3),u=Re(e.inputs,4),p=Re(e.inputs,5),d=Re(e.inputs,6),f=Re(e.inputs,7);if(a.dims.length===5)throw new Error("Packed QKV is not implemented");if((n==null?void 0:n.dims.length)===5)throw new Error("Packed KV is not implemented");let m=n&&r&&n.dims.length===4&&r.dims.length===4,g=di(e,i.batchSize,i.numHeads,i.sequenceLength,i.headSize,a,o,0);if(m)return fi(e,g,n,r,u,void 0,d,f,p,i);if(!n||!r)throw new Error("key and value must be provided");let _=di(e,i.batchSize,i.numHeads,i.kvSequenceLength,i.headSize,n,o,i.hiddenSize),b=di(e,i.batchSize,i.numHeads,i.kvSequenceLength,i.vHeadSize,r,o,2*i.hiddenSize);fi(e,g,_,b,u,void 0,d,f,p,i)}}),Mu,Pu,Uu,qu,Ia,Mc,Pc,Uc=q(()=>{re(),ne(),xe(),oe(),Mu=e=>{if(!e||e.length<1)throw new Error("too few inputs")},Pu=(e,t)=>{let i=[],a=t.numOutputs;return e[1].dims[0]>0&&(e[1].getBigInt64Array().forEach(n=>i.push(Number(n))),a=i.length),fe({numOutputs:a,axis:t.axis,splitSizes:i})},Uu=e=>`
fn calculateOutputIndex(index: u32) -> u32 {
    for (var i: u32 = 0u; i < ${e}u; i += 1u ) {
    if (index < ${X("uniforms.size_in_split_axis","i",e)}) {
        return i;
    }
    }
    return ${e}u;
}`,qu=e=>{let t=e.length,i=[];for(let a=0;a<t;++a){let n=e[a].setByIndices("indices","input[global_idx]");t===1?i.push(n):a===0?i.push(`if (output_number == ${a}u) { ${n} }`):a===t-1?i.push(`else { ${n} }`):i.push(`else if (output_number == ${a}) { ${n} }`)}return`
      fn writeBufferData(output_number: u32, indices: ${e[0].type.indices}, global_idx: u32) {
        ${i.join(`
`)}
      }`},Ia=(e,t)=>{let i=e[0].dims,a=O.size(i),n=e[0].dataType,r=O.normalizeAxis(t.axis,i.length),o=new Array(t.numOutputs),u=N("input",n,i.length),p=new Array(t.numOutputs),d=[],f=[],m=0,g=[{type:12,data:a}];for(let b=0;b<t.numOutputs;b++){m+=t.splitSizes[b],p[b]=m;let w=i.slice();w[r]=t.splitSizes[b],f.push(w),o[b]=K(`output${b}`,n,w.length),d.push({dims:f[b],dataType:e[0].dataType})}g.push({type:12,data:p},...Q(i,...f));let _=b=>`
  ${b.registerUniform("input_size","u32").registerUniform("size_in_split_axis","u32",p.length).declareVariables(u,...o)}
  ${Uu(p.length)}
  ${qu(o)}

  ${b.mainStart()}
    ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.input_size")}

    var indices = ${u.offsetToIndices("global_idx")};
    var index = ${u.indicesGet("indices",r)};
    let output_number = calculateOutputIndex(index);
    if (output_number != 0) {
      index -= ${X("uniforms.size_in_split_axis","output_number - 1u",p.length)};
      ${u.indicesSet("indices",r,"index")};
    }
    writeBufferData(output_number, indices, global_idx);
  }`;return{name:"Split",shaderCache:{hint:t.cacheKey,inputDependencies:["rank"]},getShaderSource:_,getRunData:()=>({outputs:d,dispatchGroup:{x:Math.ceil(a/64)},programUniforms:g})}},Mc=(e,t)=>{Mu(e.inputs);let i=e.inputs.length===1?t:Pu(e.inputs,t);e.compute(Ia(e.inputs,i),{inputs:[0]})},Pc=e=>{let t=e.axis,i=e.splitSizes,a=e.numOutputs<0?i.length:e.numOutputs;if(a!==i.length)throw new Error("numOutputs and splitSizes length must be equal");return fe({axis:t,numOutputs:a,splitSizes:i})}}),Wu,Gi,qc,Wc=q(()=>{re(),ne(),xe(),oe(),Wu=(e,t)=>{let[i,a,n,r]=e,{numHeads:o,rotaryEmbeddingDim:u}=t;if(i.dims.length!==3&&i.dims.length!==4)throw new Error(`Input 'x' is expected to have 3 or 4 dimensions, got ${i.dims.length}`);if(!O.areEqual(a.dims,[])&&!O.areEqual(a.dims,[1])&&a.dims.length!==2)throw new Error(`Input 'position_ids' is expected to have 0, 1, or 2 dimensions, got ${a.dims.length}`);if(n.dims.length!==2)throw new Error(`Input 'cos_cache' is expected to have 2 dimensions, got ${n.dims.length}`);if(r.dims.length!==2)throw new Error(`Input 'sin_cache' is expected to have 2 dimensions, got ${r.dims.length}`);if(!O.areEqual(n.dims,r.dims))throw new Error("Inputs 'cos_cache' and 'sin_cache' are expected to have the same shape");if(u>0&&o===0)throw new Error("num_heads must be provided if rotary_embedding_dim is specified");let p=i.dims[0],d=i.dims[i.dims.length-2],f=n.dims[0],m=O.sizeFromDimension(i.dims,1)/d,g=u===0?n.dims[1]*2:m/o;if(u>g)throw new Error("rotary_embedding_dim must be less than or equal to head_size");if(a.dims.length===2){if(p!==a.dims[0])throw new Error(`Input 'position_ids' dimension 0 should be of size batch_size, got ${a.dims[0]}`);if(d!==a.dims[1])throw new Error(`Input 'position_ids' dimension 1 should be of size sequence_length, got ${a.dims[1]}`)}if(g/2!==n.dims[1]&&u/2!==n.dims[1])throw new Error(`Input 'cos_cache' dimension 1 should be same as head_size / 2 or rotary_embedding_dim / 2, got ${n.dims[1]}`);if(d>f)throw new Error("Updating cos_cache and sin_cache in RotaryEmbedding is not currently supported")},Gi=(e,t)=>{let{interleaved:i,numHeads:a,rotaryEmbeddingDim:n,scale:r}=t,o=e[0].dims[0],u=O.sizeFromDimension(e[0].dims,1),p=e[0].dims[e[0].dims.length-2],d=u/p,f=e[2].dims[1],m=n===0?f*2:d/a,g=new Array(o,p,d/m,m-f),_=O.computeStrides(g),b=[{type:1,data:r},{type:12,data:g},{type:12,data:_},...e[0].dims.length===3?new Array({type:12,data:[u,d,m,1]}):[],...e[0].dims.length===4?new Array({type:12,data:[u,m,p*m,1]}):[],...Q(e[0].dims,e[1].dims,e[2].dims,e[3].dims,e[0].dims)],w=C=>{let v=N("input",e[0].dataType,e[0].dims.length),$=N("position_ids",e[1].dataType,e[1].dims.length),T=N("cos_cache",e[2].dataType,e[2].dims.length),k=N("sin_cache",e[3].dataType,e[3].dims.length),S=K("output",e[0].dataType,e[0].dims.length);return C.registerUniforms([{name:"scale",type:"f32"},{name:"global_shape",type:"u32",length:g.length},{name:"global_strides",type:"u32",length:_.length},{name:"input_output_strides",type:"u32",length:_.length}]),`
        ${C.declareVariables(v,$,T,k,S)}

        ${C.mainStart(jt)}
          let half_rotary_emb_dim = uniforms.${T.name}_shape[1];
          let bsnh = global_idx / uniforms.global_strides % uniforms.global_shape;
          let size = uniforms.global_shape[0] * uniforms.global_strides[0];
          ${C.guardAgainstOutOfBoundsWorkgroupSizes("size")}

          if (bsnh[3] < half_rotary_emb_dim) {
            let position_ids_idx =
                ${$.broadcastedIndicesToOffset("bsnh.xy",K("",$.type.tensor,2))};
            let position_id =
                u32(${$.getByOffset("position_ids_idx")}) + select(0, bsnh[1], position_ids_idx == 0);
            let i = dot(bsnh, uniforms.input_output_strides) + select(0, bsnh[3], ${i});
            let j = i + select(half_rotary_emb_dim, 1, ${i});
            let re = ${v.getByOffset("i")} * ${T.get("position_id","bsnh[3]")} -
                ${v.getByOffset("j")} * ${k.get("position_id","bsnh[3]")};
            ${S.setByOffset("i","re")}
            let im = ${v.getByOffset("i")} * ${k.get("position_id","bsnh[3]")} +
                ${v.getByOffset("j")} * ${T.get("position_id","bsnh[3]")};
            ${S.setByOffset("j","im")}
          } else {
            let k = dot(bsnh, uniforms.input_output_strides) + half_rotary_emb_dim;
            ${S.setByOffset("k",v.getByOffset("k"))}
          }
        }`};return{name:"RotaryEmbedding",shaderCache:{hint:fe({interleaved:i}).cacheKey,inputDependencies:["rank","rank","rank","rank"]},getShaderSource:w,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(O.size(g)/jt)},programUniforms:b})}},qc=(e,t)=>{Wu(e.inputs,t),e.compute(Gi(e.inputs,t))}}),Lu,Vu,Xr,ju,Lc,tg=q(()=>{xe(),re(),Ga(),Dc(),Uc(),bt(),Wc(),oe(),Lu=(e,t)=>{if(t.doRotary&&e.length<=7)throw new Error("cos_cache and sin_cache inputs are required if do_rotary is specified");let i=e[0],a=e[1],n=e[2],r=e[3],o=e[4];if(t.doRotary!==0&&e.length<=7)throw new Error("cos_cast and sin_cache are expected if do_rotary attribute is non-zero");if(t.localWindowSize!==-1)throw new Error("Local attention is not supported");if(t.softcap!==0)throw new Error("Softcap is not supported");if(t.rotaryInterleaved!==0)throw new Error("Rotary interleaved is not supported");if(t.smoothSoftmax)throw new Error("Smooth softmax is not supported");if(i.dims.length!==3&&i.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let u=!1,p=i.dims[0],d=i.dims[1],f=i.dims.length===3?u?i.dims[2]/3:i.dims[2]:t.numHeads*i.dims[4],m=d,g=0,_=!a||a.dims.length===0,b=Math.floor(_?f/(t.numHeads+2*t.kvNumHeads):f/t.numHeads);_&&(f=b*t.numHeads);let w=r&&r.dims.length!==0,C=o&&o.dims.length!==0;if(w&&r.dims.length===4&&r.dims[0]===p&&r.dims[1]!==t.kvNumHeads&&r.dims[2]===t.kvNumHeads&&r.dims[3]===b)throw new Error("BSNH pastKey/pastValue is not supported");if(w&&C){if(r.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(o.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');g=r.dims[2]}else if(w||C)throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let v=1;if(a&&a.dims.length>0){if(i.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(a.dims.length<3||a.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(i.dims[0]!==a.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(a.dims.length===3){if(i.dims[2]%a.dims[2]!==0)throw new Error('Dimension 2 of "query" should be a multiple of "key"');m=a.dims[1]}else if(a.dims.length===5){if(a.dims[2]!==t.numHeads||a.dims[3]!==2||a.dims[4]!==b)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(n)throw new Error('Expect "value" be none when "key" has packed kv format.');m=a.dims[1]}else{if(a.dims[1]!==t.numHeads||a.dims[3]!==b)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');m=a.dims[2]}}else{if(i.dims.length!==3&&i.dims.length!==5)throw new Error('Input "query" is expected to have 3 or 5 dimensions when key is empty');if(i.dims.length===5&&(i.dims[2]!==t.numHeads||i.dims[3]!==3))throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');v=3}let $=0,T=!1,k=t.kvNumHeads?b*t.kvNumHeads:f;if(n&&n.dims.length>0){if(n.dims.length!==3&&n.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(i.dims[0]!==n.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(n.dims.length===3){if(m!==n.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');k=n.dims[2]}else{if(m!==n.dims[2])throw new Error('Input "past_key" and "past_value" shall have the same dim 2 (kv_sequence_length)');k=n.dims[1]*n.dims[3],T=!0}}let S=e.length>4?e[5]:void 0;if(S&&S.dims.length!==1&&S.dims[0]!==p)throw new Error('Input "seqlens" is expected to have 1 dimension and the same dim 0 as batch_size');return{batchSize:p,sequenceLength:d,pastSequenceLength:g,kvSequenceLength:m,totalSequenceLength:-1,maxSequenceLength:-1,inputHiddenSize:0,hiddenSize:f,vHiddenSize:k,headSize:b,vHeadSize:Math.floor(k/t.kvNumHeads),numHeads:t.numHeads,kvNumHeads:t.kvNumHeads,nReps:t.numHeads/t.kvNumHeads,pastPresentShareBuffer:!1,maskType:$,scale:t.scale,broadcastResPosBias:!1,passPastInKv:T,qkvFormat:v}},Vu=fe({perm:[0,2,1,3]}),Xr=(e,t,i)=>{let a=t,n=i.kvNumHeads;return t.dims.length===3&&i.kvSequenceLength!==0&&(a=t.reshape([i.batchSize,i.kvSequenceLength,n,i.headSize]),a=e.compute(qe(a,Vu.perm),{inputs:[a],outputs:[-1]})[0]),a},ju=(e,t,i,a)=>{let n=7,r=["type","type"],o=[e*t],u=e*t,p=[{type:12,data:u},{type:12,data:t},{type:12,data:e}],d=f=>{let m=N("seq_lens",i.dataType,i.dims),g=N("total_seq_lens",a.dataType,a.dims),_=K("pos_ids",n,o),b=[{name:"output_size",type:"u32"},{name:"sequence_length",type:"u32"},{name:"batch_size",type:"u32"}];return`
  ${f.registerUniforms(b).declareVariables(m,g,_)}
  ${f.mainStart()}
    ${f.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let total_sequence_length = u32(${g.getByOffset("0")});
    let is_subsequent_prompt = uniforms.sequence_length > 1 && uniforms.sequence_length != total_sequence_length;
    let is_first_prompt = !is_subsequent_prompt && uniforms.sequence_length == total_sequence_length;
    let batch_idx = global_idx / uniforms.sequence_length;
    let sequence_idx = i32(global_idx % uniforms.sequence_length);
    var pos_id: i32 = 0;
    let seqlen = ${m.getByOffset("batch_idx")};
    let total_seqlen = seqlen + 1;
    if (is_first_prompt) {
      if (sequence_idx < total_seqlen) {
        pos_id = sequence_idx;
      } else {
        pos_id = 1;
      }
      ${_.setByOffset("global_idx","pos_id")}
    } else if (is_subsequent_prompt) {
      let past_seqlen = total_seqlen - i32(uniforms.sequence_length);
      if (past_seqlen + sequence_idx < total_seqlen) {
        pos_id = past_seqlen + sequence_idx;
      } else {
        pos_id = 1;
      }
      ${_.setByOffset("global_idx","pos_id")}
    } else if (global_idx < uniforms.batch_size) {
      ${_.setByOffset("global_idx","seqlen")}
    };
  }
  `};return{name:"GeneratePositionIds",shaderCache:{hint:`${e};${t}`,inputDependencies:r},getRunData:()=>({outputs:[{dims:o,dataType:n}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:p}),getShaderSource:d}},Lc=(e,t)=>{var k;let i=Lu(e.inputs,t);if(e.inputs[0].dims.length===5)throw new Error("Packed QKV is not implemented");if(((k=e.inputs[1])==null?void 0:k.dims.length)===5)throw new Error("Packed KV is not implemented");let a=e.inputs[0],n=e.inputs[1]&&e.inputs[1].dims.length>0?e.inputs[1]:void 0,r=e.inputs[2]&&e.inputs[2].dims.length>0?e.inputs[2]:void 0,o=e.inputs[3]&&e.inputs[3].dims.length!==0?e.inputs[3]:void 0,u=e.inputs[4]&&e.inputs[4].dims.length!==0?e.inputs[4]:void 0,p=e.inputs.length>4?e.inputs[5]:void 0,d=e.inputs.length>5?e.inputs[6]:void 0,f=i.kvNumHeads?i.kvNumHeads:i.numHeads,m=fe({axis:2,numOutputs:3,splitSizes:[i.numHeads*i.headSize,f*i.headSize,f*i.headSize]}),[g,_,b]=!n&&!r?e.compute(Ia([a],m),{inputs:[a],outputs:[-1,-1,-1]}):[a,n,r],w,C;if(t.doRotary){let S=e.compute(ju(i.batchSize,i.sequenceLength,p,d),{inputs:[p,d],outputs:[-1]})[0],E=e.inputs[7],z=e.inputs[8],R=fe({interleaved:t.rotaryInterleaved!==0,numHeads:i.numHeads,rotaryEmbeddingDim:0,scale:t.scale}),M=[g,S,E,z],L=[-1];w=e.compute(Gi(M,R),{inputs:M,outputs:L})[0],M.splice(0,1,_);let J=fe({interleaved:t.rotaryInterleaved!==0,numHeads:i.kvNumHeads,rotaryEmbeddingDim:0,scale:t.scale});C=e.compute(Gi(M,J),{inputs:M,outputs:L})[0]}let v=di(e,i.batchSize,i.numHeads,i.sequenceLength,i.headSize,t.doRotary?w:g,void 0,0),$=Xr(e,t.doRotary?C:_,i),T=Xr(e,b,i);fi(e,v,$,T,void 0,void 0,o,u,void 0,i,p,d)}}),Qr,Gu,Hu,Vc,ig=q(()=>{re(),ne(),bt(),oe(),Qr=(e,t,i,a,n,r,o,u)=>{let p=ve(r),d=p===1?"f32":`vec${p}f`,f=p===1?"vec2f":`mat2x${p}f`,m=n*o,g=64;m===1&&(g=256);let _=[n,o,r/p],b=[n,o,2],w=["rank","type","type"],C=[];C.push(...Q(_,b));let v=$=>{let T=N("x",t.dataType,3,p),k=N("scale",i.dataType,i.dims),S=N("bias",a.dataType,a.dims),E=K("output",1,3,2),z=[T,k,S,E];return`
  var<workgroup> workgroup_shared : array<${f}, ${g}>;
  const workgroup_size = ${g}u;
  ${$.declareVariables(...z)}
  ${$.mainStart(g)}
    let batch = workgroup_index / uniforms.x_shape[1];
    let channel = workgroup_index % uniforms.x_shape[1];
    let hight = uniforms.x_shape[2];
    // initialize workgroup memory
    var sum = ${d}(0);
    var squared_sum = ${d}(0);
    for (var h = local_idx; h < hight; h += workgroup_size) {
      let value = ${d}(${T.get("batch","channel","h")});
      sum += value;
      squared_sum += value * value;
    }
    workgroup_shared[local_idx] = ${f}(sum, squared_sum);
    workgroupBarrier();

    for (var currSize = workgroup_size >> 1;  currSize > 0; currSize = currSize >> 1) {
      if (local_idx < currSize) {
        workgroup_shared[local_idx] = workgroup_shared[local_idx] + workgroup_shared[local_idx + currSize];
      }
      workgroupBarrier();
    }
    if (local_idx == 0) {
      let sum_final = ${yt("workgroup_shared[0][0]",p)} / f32(hight * ${p});
      let squared_sum_final = ${yt("workgroup_shared[0][1]",p)} / f32(hight * ${p});

      let inv_std_dev = inverseSqrt(squared_sum_final - sum_final * sum_final + f32(${u}));
      let channel_scale = inv_std_dev * f32(scale[channel]);
      let channel_shift = f32(bias[channel]) - sum_final * channel_scale;
      output[workgroup_index] = vec2f(channel_scale, channel_shift);
    }
  }`};return e.compute({name:"InstanceNormComputeChannelScaleShift",shaderCache:{hint:`${p};${u};${g}`,inputDependencies:w},getRunData:()=>({outputs:[{dims:b,dataType:1}],dispatchGroup:{x:m},programUniforms:C}),getShaderSource:v},{inputs:[t,i,a],outputs:[-1]})[0]},Gu=(e,t,i)=>{let a=t[0].dims,n=a,r=2,o=a[0],u=a[1],p=O.sizeFromDimension(a,r),d=ve(p),f=O.size(n)/d,m=Qr(e,t[0],t[1],t[2],o,p,u,i.epsilon),g=[o,u,p/d],_=[o,u],b=["type","none"],w=C=>{let v=N("x",t[0].dataType,g.length,d),$=N("scale_shift",1,_.length,2),T=K("output",t[0].dataType,g.length,d),k=[v,$,T];return`
  ${C.registerUniform("output_size","u32").declareVariables(...k)}
  ${C.mainStart()}
  ${C.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let outputIndices = ${T.offsetToIndices("global_idx")};
      let batch = outputIndices[0];
      let channel = outputIndices[1];
      let scale_shift = ${$.getByIndices("vec2<u32>(batch, channel)")};
      let value = ${v.getByOffset("global_idx")} * ${T.type.value}(scale_shift.x) + ${T.type.value}(scale_shift.y);
      ${T.setByOffset("global_idx","value")};
  }`};e.compute({name:"InstanceNormalization",shaderCache:{hint:`${d}`,inputDependencies:b},getRunData:()=>({outputs:[{dims:n,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:[{type:12,data:f},...Q(g,_,g)]}),getShaderSource:w},{inputs:[t[0],m]})},Hu=(e,t,i)=>{let a=t[0].dims,n=a,r=a[0],o=a[a.length-1],u=O.sizeFromDimension(a,1)/o,p=ve(o),d=O.size(n)/p,f=[{type:12,data:u},{type:12,data:Math.floor(o/p)}],m=["type","type"],g=!1,_=[0,a.length-1];for(let v=0;v<a.length-2;v++)g=g||a[v+1]!==1,_.push(v+1);g=g&&a[a.length-1]!==1;let b=g?e.compute(qe(e.inputs[0],_),{inputs:[e.inputs[0]],outputs:[-1]})[0]:e.inputs[0].reshape(Array.from({length:a.length},(v,$)=>a[_[$]])),w=Qr(e,b,t[1],t[2],r,u,o,i.epsilon),C=v=>{let $=Se(t[0].dataType),T=p===1?"vec2f":`mat${p}x2f`,k=z=>{let R=z===0?"x":"y",M=p===1?"f32":`vec${p}f`;switch(p){case 1:return`${$}(${M}(scale.${R}))`;case 2:return`vec2<${$}>(${M}(scale[0].${R}, scale[1].${R}))`;case 4:return`vec4<${$}>(${M}(scale[0].${R}, scale[1].${R}, scale[2].${R}, scale[3].${R}))`;default:throw new Error(`Not supported compoents ${p}`)}},S=N("input",t[0].dataType,t[0].dims,p),E=K("output",t[0].dataType,n,p);return`
  @group(0) @binding(0) var<storage, read> input : array<${S.type.storage}>;
  @group(0) @binding(1) var<storage, read> scale_input : array<${T}>;
  @group(0) @binding(2) var<storage, read_write> output : array<${E.type.storage}>;
  struct Uniforms {H: u32, C : u32};
  @group(0) @binding(3) var<uniform> uniforms: Uniforms;

  ${v.mainStart()}
    let current_image_number = global_idx / (uniforms.C * uniforms.H);
    let current_channel_number = global_idx % uniforms.C;

    let scale_offset = current_image_number * uniforms.C + current_channel_number;
    let scale = scale_input[scale_offset];
    output[global_idx] = fma(input[global_idx], ${k(0)}, ${k(1)});
  }`};e.compute({name:"InstanceNormalizationNHWC",shaderCache:{hint:`${p}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:n,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:f}),getShaderSource:C},{inputs:[t[0],w]})},Vc=(e,t)=>{t.format==="NHWC"?Hu(e,e.inputs,t):Gu(e,e.inputs,t)}}),Fu,Ku,jc,rg=q(()=>{re(),ne(),oe(),Fu=e=>{if(!e||e.length<2)throw new Error("layerNorm requires at least 2 inputs.")},Ku=(e,t,i)=>{let a=t.simplified,n=e[0].dims,r=e[1],o=!a&&e[2],u=n,p=O.normalizeAxis(t.axis,n.length),d=O.sizeToDimension(n,p),f=O.sizeFromDimension(n,p),m=O.size(r.dims),g=o?O.size(o.dims):0;if(m!==f||o&&g!==f)throw new Error(`Size of X.shape()[axis:] == ${f}.
       Size of scale and bias (if provided) must match this.
       Got scale size of ${m} and bias size of ${g}`);let _=[];for(let S=0;S<n.length;++S)S<p?_.push(n[S]):_.push(1);let b=ve(f),w=["type","type"],C=[{type:12,data:d},{type:1,data:f},{type:12,data:Math.floor(f/b)},{type:1,data:t.epsilon}];o&&w.push("type");let v=i>1,$=i>2,T=S=>{let E=Se(e[0].dataType),z=[N("x",e[0].dataType,e[0].dims,b),N("scale",r.dataType,r.dims,b)];o&&z.push(N("bias",o.dataType,o.dims,b)),z.push(K("output",e[0].dataType,u,b)),v&&z.push(K("mean_data_output",1,_)),$&&z.push(K("inv_std_output",1,_));let R=[{name:"norm_count",type:"u32"},{name:"norm_size",type:"f32"},{name:"norm_size_vectorized",type:"u32"},{name:"epsilon",type:"f32"}];return`
  ${S.registerUniforms(R).declareVariables(...z)}
  ${S.mainStart()}
    ${S.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.norm_count")}
    let offset = global_idx * uniforms.norm_size_vectorized;
    var mean_vector = ${ba("f32",b)};
    var mean_square_vector = ${ba("f32",b)};

    for (var h: u32 = 0u; h < uniforms.norm_size_vectorized; h++) {
      let value = ${Lt(E,b,"x[h + offset]")};
      mean_vector += value;
      mean_square_vector += value * value;
    }
    let mean = ${yt("mean_vector",b)} / uniforms.norm_size;
    let inv_std_dev = inverseSqrt(${yt("mean_square_vector",b)} / uniforms.norm_size ${a?"":"- mean * mean"} + uniforms.epsilon);

    for (var j: u32 = 0; j < uniforms.norm_size_vectorized; j++) {
      let f32input = ${Lt(E,b,"x[j + offset]")};
      let f32scale = ${Lt(E,b,"scale[j]")};
      output[j + offset] = ${z[0].type.value}((f32input ${a?"":"- mean"}) * inv_std_dev * f32scale
        ${o?`+ ${Lt(E,b,"bias[j]")}`:""}
      );
    }

    ${v?"mean_data_output[global_idx] = mean":""};
    ${$?"inv_std_output[global_idx] = inv_std_dev":""};
  }`},k=[{dims:u,dataType:e[0].dataType}];return v&&k.push({dims:_,dataType:1}),$&&k.push({dims:_,dataType:1}),{name:"LayerNormalization",shaderCache:{hint:`${b};${i};${a}`,inputDependencies:w},getRunData:()=>({outputs:k,dispatchGroup:{x:Math.ceil(d/64)},programUniforms:C}),getShaderSource:T}},jc=(e,t)=>{Fu(e.inputs),e.compute(Ku(e.inputs,t,e.outputCount))}}),Zu,Gc,ag=q(()=>{ne(),Ya(),Xa(),Zu=e=>{if(!e||e.length!==2)throw new Error("MatMul requires 2 inputs.");if(e[0].dims[e[0].dims.length-1]!==e[1].dims[e[1].dims.length-2])throw new Error("shared dimension does not match.")},Gc=e=>{Zu(e.inputs);let t=Vt.calcShape(e.inputs[0].dims,e.inputs[1].dims,!0);if(!t)throw new Error("Can't use matmul on the given tensors");let i=t[t.length-1],a=e.inputs[0].dims[e.inputs[0].dims.length-1];if(i<8&&a<8)e.compute(Za(e.inputs,{activation:""},t));else{let n=t[t.length-2],r=O.size(e.inputs[0].dims.slice(0,-2)),o=O.size(e.inputs[1].dims.slice(0,-2));if(r!==1&&n===1&&o===1){let u=e.inputs[0].reshape([1,r,a]),p=e.inputs[1].reshape([1,a,i]),d=[1,r,i],f=[u,p];e.compute(ji(f,{activation:""},t,d),{inputs:f})}else e.compute(ji(e.inputs,{activation:""},t))}}}),Yu,Xu,Qu,Hc,Fc,ng=q(()=>{re(),ne(),xe(),oe(),Yu=(e,t)=>{if(e.length<3||e.length>4)throw new Error("MatMulNBits requires 3 or 4 inputs");let i=e[0],a=i.dims.length;if(i.dims[a-1]!==t.k)throw new Error("The last dim of input shape does not match the k value");let n=Math.floor((t.k+t.blockSize-1)/t.blockSize),r=t.blockSize/8*t.bits,o=e[1];if(!O.areEqual(o.dims,[t.n,n,r]))throw new Error("The second inputs must be 3D tensor with shape N X nBlocksPerCol X blobSize");let u=e[2].dims;if(O.size(u)!==t.n*n)throw new Error("scales input size error.");if(e.length===4){let p=e[3].dims,d=t.n*(t.bits===8?n:Math.floor((n*t.bits+7)/8));if(O.size(p)!==d)throw new Error("zeroPoints input size error.")}},Xu=(e,t)=>{let i=e[0].dims,a=i.length,n=i[a-2],r=t.k,o=t.n,u=i.slice(0,a-2),p=O.size(u),d=e[1].dims[2]/4,f=e[0].dataType,m=ve(t.k),g=ve(d),_=ve(o),b=u.concat([n,o]),w=n>1&&o/_%2===0?2:1,C=O.size(b)/_/w,v=64,$=[],T=[p,n,r/m],k=O.convertShape(e[1].dims).slice();k.splice(-1,1,d/g),$.push(...Q(T)),$.push(...Q(k)),$.push(...Q(e[2].dims)),e.length===4&&$.push(...Q(O.convertShape(e[3].dims)));let S=[p,n,o/_];$.push(...Q(S));let E=z=>{let R=T.length,M=N("a",e[0].dataType,R,m),L=N("b",12,k.length,g),J=N("scales",e[2].dataType,e[2].dims.length),H=[M,L,J],j=e.length===4?N("zero_points",12,e[3].dims.length):void 0;j&&H.push(j);let le=S.length,ae=K("output",e[0].dataType,le,_),Z=Se(e[0].dataType),se=(()=>{switch(m){case 1:return`array<${Z}, 8>`;case 2:return`mat4x2<${Z}>`;case 4:return`mat2x4<${Z}>`;default:throw new Error(`${m}-component is not supported.`)}})(),Y=()=>{let D=`
          // reuse a data
            var input_offset = ${M.indicesToOffset(`${M.type.indices}(batch, row, word_offset)`)};
            var a_data: ${se};
            for (var j: u32 = 0; j < ${8/m}; j++) {
              a_data[j] = ${M.getByOffset("input_offset")};
              input_offset++;
            }
          `;for(let V=0;V<_*w;V++)D+=`
            b_value = ${g===1?`b${V}_data`:`b${V}_data[i]`};
            b_value_lower = unpack4xU8(b_value & b_mask);
            b_value_upper = unpack4xU8((b_value >> 4) & b_mask);
            b_quantized_values = ${se}(${Array.from({length:4},(G,ee)=>`${Z}(b_value_lower[${ee}]), ${Z}(b_value_upper[${ee}])`).join(", ")});
            b_dequantized_values = ${m===1?`${se}(${Array.from({length:8},(G,ee)=>`(b_quantized_values[${ee}] - ${j?`zero_point${V}`:"zero_point"}) * scale${V}`).join(", ")});`:`(b_quantized_values - ${se}(${Array(8).fill(`${j?`zero_point${V}`:"zero_point"}`).join(",")})) * scale${V};`};
            workgroup_shared[local_id.x * ${w} + ${Math.floor(V/_)}]${_>1?`[${V%_}]`:""} += ${Array.from({length:8/m},(G,ee)=>`${m===1?`a_data[${ee}] * b_dequantized_values[${ee}]`:`dot(a_data[${ee}], b_dequantized_values[${ee}])`}`).join(" + ")};
          `;return D},te=()=>{let D=`
            var col_index = col * ${_};
            ${j?`
            let zero_point_bytes_per_col = (nBlocksPerCol + 1) / 2;
            var zero_point_byte_count: u32;
            var zero_point_word_index: u32;
            var zero_point_byte_offset: u32;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            var zero_point_bits_offset: u32;
            var zero_point_word: u32;`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${Z}(8);`}
            `;for(let V=0;V<_*w;V++)D+=`
            let scale${V} = ${J.getByOffset("col_index * nBlocksPerCol + block")};
            ${j?`
            zero_point_byte_count = col_index * zero_point_bytes_per_col + (block >> 0x1u);
            zero_point_word_index = zero_point_byte_count >> 0x2u;
            zero_point_byte_offset = zero_point_byte_count & 0x3u;
            zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            zero_point_word = ${j.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point${V} = ${Z}((zero_point_word) & 0xFu);`:""}
            col_index += 1;`;return D},ge=()=>{let D=`col_index = col * ${_};`;for(let V=0;V<_*w;V++)D+=`
            let b${V}_data = ${L.getByIndices(`${L.type.indices}(col_index, block, word)`)};
            col_index += 1;`;return D+=`
            var b_value: u32;
            let b_mask: u32 = 0x0F0F0F0Fu;
            var b_value_lower: vec4<u32>;
            var b_value_upper: vec4<u32>;
            var b_quantized_values: ${se};
            var b_dequantized_values: ${se};`,D};return`
        var<workgroup> workgroup_shared: array<${ae.type.value}, ${w*v}>;
        ${z.declareVariables(...H,ae)}
        ${z.mainStart([v,1,1])}
          let output_indices = ${ae.offsetToIndices(`(global_idx / ${v}) * ${w}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let nBlocksPerCol = uniforms.b_shape[1];

          for (var block = local_id.x; block < nBlocksPerCol; block += ${v}) {
            //process one block
            var word_offset: u32 = block * ${t.blockSize/m};
            ${te()}
            for (var word: u32 = 0; word < ${d}; word += ${g}) {
              ${ge()}
              for (var i: u32 = 0; i < ${g}; i++) {
                ${Y()}
                word_offset += ${8/m};
              }
            }
          }
          workgroupBarrier();

          if (local_id.x < ${w}) {
            var output_value: ${ae.type.value} = ${ae.type.value}(0);
            var workgroup_shared_offset: u32 = local_id.x;
            for (var b: u32 = 0u; b < ${v}u; b++) {
              output_value += workgroup_shared[workgroup_shared_offset];
              workgroup_shared_offset += ${w};
            }
            ${ae.setByIndices(`${ae.type.indices}(batch, row, col + local_id.x)`,"output_value")};
          }
        }`};return{name:"MatMulNBits",shaderCache:{hint:`${t.blockSize};${t.bits};${m};${g};${_};${w};${v}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:b,dataType:f}],dispatchGroup:{x:C},programUniforms:$}),getShaderSource:E}},Qu=(e,t)=>{let i=e[0].dims,a=i.length,n=i[a-2],r=t.k,o=t.n,u=i.slice(0,a-2),p=O.size(u),d=e[1].dims[2]/4,f=e[0].dataType,m=ve(t.k),g=ve(d),_=u.concat([n,o]),b=128,w=o%8===0?8:o%4===0?4:1,C=b/w,v=C*g*8,$=v/m,T=v/t.blockSize,k=O.size(_)/w,S=[],E=[p,n,r/m],z=O.convertShape(e[1].dims).slice();z.splice(-1,1,d/g),S.push(...Q(E)),S.push(...Q(z)),S.push(...Q(e[2].dims)),e.length===4&&S.push(...Q(O.convertShape(e[3].dims)));let R=[p,n,o];S.push(...Q(R));let M=L=>{let J=E.length,H=N("a",e[0].dataType,J,m),j=N("b",12,z.length,g),le=N("scales",e[2].dataType,e[2].dims.length),ae=[H,j,le],Z=e.length===4?N("zero_points",12,e[3].dims.length):void 0;Z&&ae.push(Z);let se=R.length,Y=K("output",e[0].dataType,se),te=Se(e[0].dataType),ge=()=>{switch(m){case 1:return`
          let a_data0 = vec4<${te}>(sub_a[word_offset], sub_a[word_offset + 1], sub_a[word_offset + 2], sub_a[word_offset + 3]);
          let a_data1 = vec4<${te}>(sub_a[word_offset + 4], sub_a[word_offset + 5], sub_a[word_offset + 6], sub_a[word_offset + 7]);`;case 2:return`
          let a_data0 = vec4<${te}>(sub_a[word_offset], sub_a[word_offset + 1]);
          let a_data1 = vec4<${te}>(sub_a[word_offset + 2], sub_a[word_offset + 3]);`;case 4:return`
          let a_data0 = sub_a[word_offset];
          let a_data1 = sub_a[word_offset + 1];`;default:throw new Error(`${m}-component is not supported.`)}};return`
        var<workgroup> sub_a: array<${H.type.value}, ${$}>;
        var<workgroup> inter_results: array<array<${Y.type.value}, ${C}>, ${w}>;
        ${L.declareVariables(...ae,Y)}
        ${L.mainStart([C,w,1])}
          let output_indices = ${Y.offsetToIndices(`workgroup_index * ${w}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let n_blocks_per_col = uniforms.b_shape[1];
          let num_tiles =  (n_blocks_per_col - 1) / ${T} + 1;

          // Loop over shared dimension.
          for (var tile: u32 = 0; tile < num_tiles; tile += 1) {
            let a_col_start = tile * ${$};
            // load one tile A data into shared memory.
            for (var a_offset = local_idx; a_offset < ${$}; a_offset += ${b})
            {
              let a_col = a_col_start + a_offset;
              if (a_col < uniforms.a_shape[2])
              {
                sub_a[a_offset] = ${H.getByIndices(`${H.type.indices}(batch, row, a_col)`)};
              } else {
                sub_a[a_offset] = ${H.type.value}(0);
              }
            }
            workgroupBarrier();

            // each thread process one block
            let b_row = col + local_id.y;
            let block = tile * ${T} + local_id.x;
            ${Z?`
            let zero_point_bytes_per_col = (n_blocks_per_col + 1) / 2;
            let zero_point_byte_count = b_row * zero_point_bytes_per_col + (block >> 0x1u);
            let zero_point_word_index = zero_point_byte_count >> 0x2u;
            let zero_point_byte_offset = zero_point_byte_count & 0x3u;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            let zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            let zero_point_word = ${Z.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point = ${te}((zero_point_word) & 0xFu);`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${te}(8);`}
            let scale = ${le.getByOffset("b_row * n_blocks_per_col + block")};
            let b_data = ${j.getByIndices(`${j.type.indices}(b_row, block, 0)`)};
            var word_offset = local_id.x * ${t.blockSize/m};
            for (var i: u32 = 0; i < ${g}; i++) {
              ${ge()}
              let b_value = ${g===1?"b_data":"b_data[i]"};
              let b_value_lower = unpack4xU8(b_value & 0x0F0F0F0Fu);
              let b_value_upper = unpack4xU8((b_value >> 4) & 0x0F0F0F0Fu);
              let b_quantized_values = mat2x4<${te}>(${Array.from({length:4},(D,V)=>`${te}(b_value_lower[${V}]), ${te}(b_value_upper[${V}])`).join(", ")});
              let b_dequantized_values = (b_quantized_values - mat2x4<${te}>(${Array(8).fill("zero_point").join(",")})) * scale;
              inter_results[local_id.y][local_id.x] += ${Array.from({length:2},(D,V)=>`${`dot(a_data${V}, b_dequantized_values[${V}])`}`).join(" + ")};
              word_offset += ${8/m};
            }
            workgroupBarrier();
          }

          if (local_idx < ${w}) {
            var output_value: ${Y.type.value} = ${Y.type.value}(0);
            for (var b = 0u; b < ${C}; b++) {
              output_value += inter_results[local_idx][b];
            }
            if (col + local_idx < uniforms.output_shape[2])
            {
              ${Y.setByIndices(`${Y.type.indices}(batch, row, col + local_idx)`,"output_value")}
            }
          }
        }`};return{name:"BlockwiseMatMulNBits32",shaderCache:{hint:`${t.blockSize};${m};${g};${C};${w}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:_,dataType:f}],dispatchGroup:{x:k},programUniforms:S}),getShaderSource:M}},Hc=(e,t)=>{Yu(e.inputs,t),t.blockSize===32&&e.adapterInfo.isVendor("intel")&&e.adapterInfo.isArchitecture("gen-12lp")?e.compute(Qu(e.inputs,t)):e.compute(Xu(e.inputs,t))},Fc=e=>fe(e)}),Ju,el,tl,il,rl,al,nl,sl,Kc,sg=q(()=>{re(),ne(),oe(),Ju=e=>{if(!e||e.length<1)throw new Error("Too few inputs");if(e[0].dataType!==1&&e[0].dataType!==10)throw new Error("Input type must be float or float16.");if(e.length>=2){let t=e[0].dims.length*2===e[1].dims[0];if(e.length===4&&(t=e[3].dims[0]*2===e[1].dims[0]),!t)throw new Error("The pads should be a 1D tensor of shape [2 * input_rank] or [2 * num_axes].")}},el=(e,t,i)=>{let a="";for(let n=t-1;n>=0;--n)a+=`
            k = i32(${e.indicesGet("indices",n)}) - ${X("uniforms.pads",n,i)};
            if (k < 0) {
              break;
            }
            if (k >= i32(${X("uniforms.x_shape",n,t)})) {
              break;
            }
            offset += k * i32(${X("uniforms.x_strides",n,t)});
        `;return`
          value = ${e.type.value}(uniforms.constant_value);
          for (var i = 0; i < 1; i++) {
            var offset = 0;
            var k = 0;
            ${a}
            value = x[offset];
          }
      `},tl=(e,t,i)=>{let a="";for(let n=t-1;n>=0;--n)a+=`
                k = i32(${e.indicesGet("indices",n)}) - ${X("uniforms.pads",n,i)};
                if (k < 0) {
                  k = -k;
                }
                {
                  let _2n_1 = 2 * (i32(${X("uniforms.x_shape",n,t)}) - 1);
                  k = k % _2n_1;
                  if(k >= i32(${X("uniforms.x_shape",n,t)})) {
                    k = _2n_1 - k;
                  }
                }
                offset += k * i32(${X("uniforms.x_strides",n,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${a}
              value = x[offset];
          `},il=(e,t,i)=>{let a="";for(let n=t-1;n>=0;--n)a+=`
                k = i32(${e.indicesGet("indices",n)}) - ${X("uniforms.pads",n,i)};
                if (k < 0) {
                  k = 0;
                }
                if (k >= i32(${X("uniforms.x_shape",n,t)})) {
                  k = i32(${X("uniforms.x_shape",n,t)}) - 1;
                }
                offset += k * i32(${X("uniforms.x_strides",n,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${a}
              value = x[offset];
          `},rl=(e,t,i)=>{let a="";for(let n=t-1;n>=0;--n)a+=`
                k = i32(${e.indicesGet("indices",n)}) - ${X("uniforms.pads",n,i)};
                if (k < 0)  {
                  k += i32(${X("uniforms.x_shape",n,t)}]);
                }
                if (k >= i32(${X("uniforms.x_shape",n,t)})) {
                  k -= i32(${X("uniforms.x_shape",n,t)});
                }
                offset += k * i32(${X("uniforms.x_strides",n,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${a}
              value = x[offset];
          `},al=(e,t,i)=>{switch(i.mode){case 0:return el(e,t,i.pads.length);case 1:return tl(e,t,i.pads.length);case 2:return il(e,t,i.pads.length);case 3:return rl(e,t,i.pads.length);default:throw new Error("Invalid mode")}},nl=(e,t)=>{let i=O.padShape(e[0].dims.slice(),t.pads),a=e[0].dims,n=O.size(i),r=[{type:12,data:n},{type:6,data:t.pads}],o=e.length>=3&&e[2].data;t.mode===0&&r.push({type:o?e[2].dataType:1,data:t.value}),r.push(...Q(e[0].dims,i));let u=["rank"],p=d=>{let f=K("output",e[0].dataType,i.length),m=N("x",e[0].dataType,a.length),g=m.type.value,_=al(f,a.length,t),b=[{name:"output_size",type:"u32"},{name:"pads",type:"i32",length:t.pads.length}];return t.mode===0&&b.push({name:"constant_value",type:o?g:"f32"}),`
            ${d.registerUniforms(b).declareVariables(m,f)}
            ${d.mainStart()}
            ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

            let indices = ${f.offsetToIndices("global_idx")};

            var value = ${g}(0);
            ${_}
            output[global_idx] = value;
        }`};return{name:"Pad",shaderCache:{hint:`${t.mode}${o}`,inputDependencies:u},getRunData:()=>({outputs:[{dims:i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(O.size(i)/64)},programUniforms:r}),getShaderSource:p}},sl=(e,t)=>{if(e.length>1){let i=e[1].getBigInt64Array(),a=e.length>=3&&e[2].data?e[2].dataType===10?e[2].getUint16Array()[0]:e[2].getFloat32Array()[0]:0,n=e[0].dims.length,r=new Int32Array(2*n).fill(0);if(e.length>=4){let u=e[3].getBigInt64Array();for(let p=0;p<u.length;p++)r[Number(u[p])]=Number(i[p]),r[Number(u[p])+n]=Number(i[p+u.length])}else i.forEach((u,p)=>r[Number(p)]=Number(u));let o=[];return r.forEach(u=>o.push(u)),{mode:t.mode,value:a,pads:o}}else return t},Kc=(e,t)=>{Ju(e.inputs);let i=sl(e.inputs,t);e.compute(nl(e.inputs,i),{inputs:[0]})}}),ri,Jr,ea,ta,ia,ol,ul,ra,aa,Zc,Yc,na,Xc,Qc,sa,Jc,ef,tf,rf,og=q(()=>{Le(),re(),ne(),oe(),ri=e=>{if(be.webgpu.validateInputContent&&(!e||e.length!==1))throw new Error("Pool ops requires 1 input.")},Jr=(e,t,i)=>{let a=t.format==="NHWC",n=e.dims.slice();a&&n.splice(1,0,n.pop());let r=Object.hasOwnProperty.call(t,"dilations"),o=t.kernelShape.slice(),u=t.strides.slice(),p=r?t.dilations.slice():[],d=t.pads.slice();Li.adjustPoolAttributes(i,n,o,u,p,d);let f=Li.computePoolOutputShape(i,n,u,p,o,d,t.autoPad),m=Object.assign({},t);r?Object.assign(m,{kernelShape:o,strides:u,pads:d,dilations:p,cacheKey:t.cacheKey}):Object.assign(m,{kernelShape:o,strides:u,pads:d,cacheKey:t.cacheKey});let g=f.slice();return g.push(g.splice(1,1)[0]),[m,a?g:f]},ea=(e,t)=>{let i=t.format==="NHWC",a=O.size(e),n=O.size(t.kernelShape),r=[{type:12,data:a},{type:12,data:n}],o=[{name:"outputSize",type:"u32"},{name:"kernelSize",type:"u32"}];if(t.kernelShape.length<=2){let u=t.kernelShape[t.kernelShape.length-1],p=t.strides[t.strides.length-1],d=t.pads[t.pads.length/2-1],f=t.pads[t.pads.length-1],m=!!(d+f);r.push({type:12,data:u},{type:12,data:p},{type:12,data:d},{type:12,data:f}),o.push({name:"kw",type:"u32"},{name:"sw",type:"u32"},{name:"pwStart",type:"u32"},{name:"pwEnd",type:"u32"});let g=!1;if(t.kernelShape.length===2){let _=t.kernelShape[t.kernelShape.length-2],b=t.strides[t.strides.length-2],w=t.pads[t.pads.length/2-2],C=t.pads[t.pads.length-2];g=!!(w+C),r.push({type:12,data:_},{type:12,data:b},{type:12,data:w},{type:12,data:C}),o.push({name:"kh",type:"u32"},{name:"sh",type:"u32"},{name:"phStart",type:"u32"},{name:"phEnd",type:"u32"})}return[r,o,!0,m,g]}else{if(i)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let u=O.computeStrides(t.kernelShape);r.push({type:12,data:u},{type:12,data:t.pads},{type:12,data:t.strides}),o.push({name:"kernelStrides",type:"u32",length:u.length},{name:"pads",type:"u32",length:t.pads.length},{name:"strides",type:"u32",length:t.strides.length});let p=t.pads.reduce((d,f)=>d+f);return[r,o,!!p,!1,!1]}},ta=(e,t,i,a,n,r,o,u,p,d,f,m)=>{let g=n.format==="NHWC",_=t.type.value,b=K("output",t.type.tensor,a);if(n.kernelShape.length<=2){let w="",C="",v="",$=i-(g?2:1);if(f?w=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${$}] = indices[${$}] * uniforms.sw - uniforms.pwStart + i;
                  if (xIndices[${$}] < 0 || xIndices[${$}]
                      >= uniforms.x_shape[${$}]) {
                    pad++;
                    continue;
                  }
                  let x_val = x[${t.indicesToOffset("xIndices")}];
                  ${r}
                }`:w=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${$}] = indices[${$}] * uniforms.sw - uniforms.pwStart + i;
                  let x_val = x[${t.indicesToOffset("xIndices")}];
                  ${r}
                }`,n.kernelShape.length===2){let T=i-(g?3:2);m?C=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${T}] = indices[${T}] * uniforms.sh - uniforms.phStart + j;
                  if (xIndices[${T}] < 0 || xIndices[${T}] >= uniforms.x_shape[${T}]) {
                    pad += i32(uniforms.kw);
                    continue;
                  }
              `:C=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${T}] = indices[${T}] * uniforms.sh - uniforms.phStart + j;
                `,v=`
              }
            `}return`
            ${e.registerUniforms(p).declareVariables(t,b)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

              let indices = ${b.offsetToIndices("global_idx")};
              var xIndices = ${b.offsetToIndices("global_idx")};

              var value = ${_}(${u});
              var pad = 0;
              ${C}
              ${w}
              ${v}
              ${o}

              output[global_idx] = value;
            }`}else{if(g)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let w=n.kernelShape.length,C=n.pads.length,v="";return d?v=`
                if (xIndices[j] >= uniforms.x_shape[j]) {
                  pad++;
                  isPad = true;
                  break;
                }
              }
              if (!isPad) {
                let x_val = x[${t.indicesToOffset("xIndices")}];
                ${r}
              }`:v=`
              }
              let x_val = x[${t.indicesToOffset("xIndices")}];
              ${r}
            `,`
            ${e.registerUniforms(p).declareVariables(t,b)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
              let indices = ${b.offsetToIndices("global_idx")};
              var xIndices = ${b.offsetToIndices("global_idx")};

              var offsets: array<u32, ${w}>;

              var value = ${_}(${u});
              var pad = 0;
              var isPad = false;

              for (var i: u32 = 0u; i < uniforms.kernelSize; i++) {
                var offset = i;
                for (var j = 0u; j < ${w-1}u; j++) {
                  offsets[j] = offset / ${X("uniforms.kernelStrides","j",w)};
                  offset -= offsets[j] * ${X("uniforms.kernelStrides","j",w)};
                }
                offsets[${w-1}] = offset;

                isPad = false;
                for (var j = ${i-w}u; j < ${i}u; j++) {
                  xIndices[j] = indices[j] * ${X("uniforms.strides",`j - ${i-w}u`,w)}
                    + offsets[j - ${i-w}u] - ${X("uniforms.pads","j - 2u",C)};
                  ${v}
              }
              ${o}

              output[global_idx] = value;
            }`}},ia=e=>`${e.format};${e.ceilMode};${e.autoPad};${e.kernelShape.length}`,ol=e=>`${ia(e)};${e.countIncludePad}`,ul=e=>`${ia(e)};${e.storageOrder};${e.dilations}`,ra=e=>({format:e.format,autoPad:["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],ceilMode:e.ceil_mode,kernelShape:e.kernel_shape,strides:e.strides,pads:e.pads}),aa=(e,t,i,a)=>{let[n,r]=Jr(t,a,i),o=N("x",t.dataType,t.dims.length),u=o.type.value,p="value += x_val;",d="";n.countIncludePad?d+=`value /= ${u}(uniforms.kernelSize);`:d+=`value /= ${u}(i32(uniforms.kernelSize) - pad);`;let[f,m,g,_,b]=ea(r,n);f.push(...Q(t.dims,r));let w=["rank"];return{name:e,shaderCache:{hint:`${a.cacheKey};${g};${_};${b}`,inputDependencies:w},getRunData:()=>({outputs:[{dims:r,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(O.size(r)/64)},programUniforms:f}),getShaderSource:C=>ta(C,o,t.dims.length,r.length,n,p,d,0,m,g,_,b)}},Zc=e=>{let t=e.count_include_pad!==0,i=ra(e);if(i.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for AveragePool");let a={countIncludePad:t,...i,cacheKey:""};return{...a,cacheKey:ol(a)}},Yc=(e,t)=>{ri(e.inputs),e.compute(aa("AveragePool",e.inputs[0],!1,t))},na={autoPad:"",ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[]},Xc=e=>{let t=e.format;return{format:t,...na,cacheKey:t}},Qc=(e,t)=>{ri(e.inputs),e.compute(aa("GlobalAveragePool",e.inputs[0],!0,t))},sa=(e,t,i,a)=>{let[n,r]=Jr(t,a,i),o=`
      value = max(x_val, value);
    `,u="",p=N("x",t.dataType,t.dims.length),d=["rank"],[f,m,g,_,b]=ea(r,n);return f.push(...Q(t.dims,r)),{name:e,shaderCache:{hint:`${a.cacheKey};${g};${_};${b}`,inputDependencies:d},getRunData:()=>({outputs:[{dims:r,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(O.size(r)/64)},programUniforms:f}),getShaderSource:w=>ta(w,p,t.dims.length,r.length,n,o,u,t.dataType===10?-65504:-1e5,m,g,_,b)}},Jc=(e,t)=>{ri(e.inputs),e.compute(sa("MaxPool",e.inputs[0],!1,t))},ef=e=>{let t=e.storage_order,i=e.dilations,a=ra(e);if(t!==0)throw new Error("column major storage order is not yet supported for MaxPool");if(a.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for MaxPool");let n={storageOrder:t,dilations:i,...a,cacheKey:""};return{...n,cacheKey:ul(n)}},tf=e=>{let t=e.format;return{format:t,...na,cacheKey:t}},rf=(e,t)=>{ri(e.inputs),e.compute(sa("GlobalMaxPool",e.inputs[0],!0,t))}}),ll,dl,af,nf,ug=q(()=>{re(),ne(),xe(),oe(),ll=(e,t)=>{if(e.length<2||e.length>3)throw new Error("DequantizeLinear requires 2 or 3 inputs.");if(e.length===3&&e[1].dims===e[2].dims)throw new Error("x-scale and x-zero-point must have the same shape.");if(e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[0].dataType===6&&e.length>2)throw new Error("In the case of dequantizing int32 there is no zero point.");if(e[1].dims.length!==0&&e[1].dims.length!==1&&e[1].dims.length!==e[0].dims.length)throw new Error("scale input must be a scalar, a 1D tensor, or have the same rank as the input tensor.");if(e.length>2){if(e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[1].dims.length!==e[2].dims.length)throw new Error("scale and zero-point inputs must have the same rank.");if(!e[1].dims.map((i,a)=>i===e[2].dims[a]).reduce((i,a)=>i&&a,!0))throw new Error("scale and zero-point inputs must have the same shape.")}if(t.blockSize>0){if(e[1].dims.length===0||e[1].dims.length===1&&e[1].dims[0]===1)throw new Error("blockSize must be set only for block quantization.");if(!e[1].dims.map((n,r)=>r===t.axis||n===e[0].dims[r]).reduce((n,r)=>n&&r,!0))throw new Error("For block qunatization, scale input shape to match the input shape except for the axis");if(e[1].dims.length!==e[0].dims.length)throw new Error("For block qunatization the scale input rank must be the same as the x rank.");let i=e[0].dims[t.axis],a=e[1].dims[t.axis];if(t.blockSize<Math.ceil(i/a)||t.blockSize>Math.ceil(i/(a-1)-1))throw new Error("blockSize must be with in the range [ceil(dI / Si), ceil(dI / (Si - 1) - 1)].")}},dl=(e,t)=>{let i=O.normalizeAxis(t.axis,e[0].dims.length),a=e[0].dataType,n=a===3,r=e[0].dims,o=e[1].dataType,u=O.size(r),p=a===3||a===2,d=p?[Math.ceil(O.size(e[0].dims)/4)]:e[0].dims,f=e[1].dims,m=e.length>2?e[2]:void 0,g=m?p?[Math.ceil(O.size(m.dims)/4)]:m.dims:void 0,_=f.length===0||f.length===1&&f[0]===1,b=_===!1&&f.length===1,w=ve(u),C=_&&(!p||w===4),v=C?w:1,$=C&&!p?w:1,T=N("input",p?12:a,d.length,$),k=N("scale",o,f.length),S=m?N("zero_point",p?12:a,g.length):void 0,E=K("output",o,r.length,v),z=[T,k];S&&z.push(S);let R=[d,f];m&&R.push(g);let M=[{type:12,data:u/v},{type:12,data:i},{type:12,data:t.blockSize},...Q(...R,r)],L=J=>{let H=[{name:"output_size",type:"u32"},{name:"axis",type:"u32"},{name:"block_size",type:"u32"}];return`
      ${J.registerUniforms(H).declareVariables(...z,E)}
      ${J.mainStart()}
          ${J.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let output_indices = ${E.offsetToIndices("global_idx")};

          // Set input x
          ${p?`
            let input = ${T.getByOffset("global_idx / 4")};
            let x_vec = ${n?"unpack4xI8(input)":"unpack4xU8(input)"};
            let x_value = ${v===1?"x_vec[global_idx % 4]":"x_vec"};`:`let x_value = ${T.getByOffset("global_idx")};`};

          // Set scale input
          ${_?`let scale_value= ${k.getByOffset("0")}`:b?`
            let scale_index = ${E.indicesGet("output_indices","uniforms.axis")};
            let scale_value= ${k.getByOffset("scale_index")};`:`
            var scale_indices: ${k.type.indices} = output_indices;
            let index = ${k.indicesGet("scale_indices","uniforms.axis")} / uniforms.block_size;
            ${k.indicesSet("scale_indices","uniforms.axis","index")};
            let scale_value= ${k.getByIndices("scale_indices")};`};

          // Set zero-point input
          ${S?_?p?`
                let zero_point_input = ${S.getByOffset("0")};
                let zero_point_vec =  ${n?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value= zero_point_vec[0]`:`let zero_point_value = ${S.getByOffset("0")}`:b?p?`
                let zero_point_index = ${E.indicesGet("output_indices","uniforms.axis")};
                let zero_point_input = ${S.getByOffset("zero_point_index / 4")};
                let zero_point_vec =  ${n?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_index % 4]`:`
                let zero_point_index = ${E.indicesGet("output_indices","uniforms.axis")};
                let zero_point_value = ${S.getByOffset("zero_point_index")};`:p?`
                let zero_point_offset = ${k.indicesToOffset("scale_indices")};
                let zero_point_input = ${S.getByOffset("zero_point_offset / 4")};
                let zero_point_vec = ${n?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_offset % 4];`:`let zero_point_value = ${S.getByIndices("scale_indices")};`:`let zero_point_value = ${p?n?"i32":"u32":T.type.value}(0);`};
      // Compute and write output
      ${E.setByOffset("global_idx",`${E.type.value}(x_value - zero_point_value) * scale_value`)};
      }`};return{name:"DequantizeLinear",shaderCache:{hint:t.cacheKey,inputDependencies:S?["rank","rank","rank"]:["rank","rank"]},getShaderSource:L,getRunData:()=>({outputs:[{dims:r,dataType:o}],dispatchGroup:{x:Math.ceil(u/v/64),y:1,z:1},programUniforms:M})}},af=(e,t)=>{ll(e.inputs,t),e.compute(dl(e.inputs,t))},nf=e=>fe({axis:e.axis,blockSize:e.blockSize})}),pl,cl,sf,lg=q(()=>{Le(),re(),oe(),pl=(e,t,i)=>{let a=e===t,n=e<t&&i<0,r=e>t&&i>0;if(a||n||r)throw new Error("Range these inputs' contents are invalid.")},cl=(e,t,i,a)=>{let n=Math.abs(Math.ceil((t-e)/i)),r=[n],o=n,u=[{type:12,data:o},{type:a,data:e},{type:a,data:i},...Q(r)],p=d=>{let f=K("output",a,r.length),m=f.type.value,g=[{name:"outputSize",type:"u32"},{name:"start",type:m},{name:"delta",type:m}];return`
        ${d.registerUniforms(g).declareVariables(f)}
        ${d.mainStart()}
        ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        output[global_idx] = uniforms.start + ${m}(global_idx) * uniforms.delta;
      }`};return{name:"Range",shaderCache:{hint:`${a}`},getShaderSource:p,getRunData:()=>({outputs:[{dims:r,dataType:a}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:u})}},sf=e=>{let t=0,i=0,a=0;e.inputs[0].dataType===6?(t=e.inputs[0].getInt32Array()[0],i=e.inputs[1].getInt32Array()[0],a=e.inputs[2].getInt32Array()[0]):e.inputs[0].dataType===1&&(t=e.inputs[0].getFloat32Array()[0],i=e.inputs[1].getFloat32Array()[0],a=e.inputs[2].getFloat32Array()[0]),be.webgpu.validateInputContent&&pl(t,i,a),e.compute(cl(t,i,a,e.inputs[0].dataType),{inputs:[]})}}),fl,hl,of,uf,dg=q(()=>{re(),ne(),xe(),oe(),fl=(e,t,i,a)=>{if(e!=="none"&&a!=="i32"&&a!=="u32"&&a!=="f32")throw new Error(`Input ${a} is not supported with reduction ${e}.`);let n=`{
                var oldValue = 0;
                loop {
                  let newValueF32 =`,r=`;
                  let newValue = bitcast<i32>(newValueF32);
                  let res = atomicCompareExchangeWeak(&${t}, oldValue, newValue);
                  if res.exchanged {
                    break;
                  }
                  oldValue = res.old_value;
                }
              }`;switch(e){case"none":return`${t}=${i};`;case"add":return a==="i32"||a==="u32"?`atomicAdd(&${t}, bitcast<${a}>(${i}));`:`
              ${n}bitcast<${a}>(oldValue) + (${i})${r}`;case"max":return a==="i32"||a==="u32"?`atomicMax(&${t}, bitcast<${a}>(${i}));`:`
                ${n}max(bitcast<f32>(oldValue), (${i}))${r}`;case"min":return a==="i32"||a==="u32"?`atomicMin(&${t}, bitcast<${a}>(${i}));`:`${n}min(bitcast<${a}>(oldValue), (${i}))${r}`;case"mul":return`${n}(bitcast<${a}>(oldValue) * (${i}))${r}`;default:throw new Error(`Reduction ${e} is not supported.`)}},hl=(e,t)=>{let i=e[0].dims,a=e[1].dims,n=i,r=1,o=Math.ceil(O.sizeToDimension(a,a.length-1)/r),u=a[a.length-1],p=O.sizeFromDimension(i,u),d=[{type:12,data:o},{type:12,data:u},{type:12,data:p},...Q(e[1].dims,e[2].dims,n)],f=m=>{let g=N("indices",e[1].dataType,e[1].dims.length),_=N("updates",e[2].dataType,e[2].dims.length,r),b=t.reduction!=="none"&&t.reduction!==""?Nd("output",e[0].dataType,n.length):K("output",e[0].dataType,n.length,r);return`
      ${m.registerUniform("output_size","u32").registerUniform("last_index_dimension","u32").registerUniform("num_updates_elements","u32").declareVariables(g,_,b)}
      ${m.mainStart()}
        ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
  var data_offset = 0u;
  let indices_start = uniforms.last_index_dimension * global_idx;
  let indices_end = indices_start + uniforms.last_index_dimension;
  for (var i = indices_start; i < indices_end; i++) {
    var index = i32(indices[i].x);
    ${e[0].dims.length===1?`
    let element_count_dim = uniforms.output_strides;
    let dim_value = uniforms.output_shape;`:`
    let element_count_dim = uniforms.output_strides[i - indices_start];
    let dim_value = uniforms.output_shape[i - indices_start];`}
    if (index >= 0) {
      if (index >= i32(dim_value)) {
        index = i32(dim_value - 1);
      }
    } else {
      if (index < -i32(dim_value)) {
        index = 0;
      } else {
        index += i32(dim_value);
      }
    }
    data_offset += u32((u32(index) * element_count_dim));
  }

  for (var i = 0u; i < uniforms.num_updates_elements; i++) {
    let value = updates[uniforms.num_updates_elements * global_idx + i];
    ${fl(t.reduction,"output[data_offset + i]","value",b.type.value)}
  }

      }`};return{name:"ScatterND",shaderCache:{hint:`${t.cacheKey}_${t.reduction}`,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:d}),getShaderSource:f}},of=e=>fe({reduction:e.reduction}),uf=(e,t)=>{e.compute(hl(e.inputs,t),{inputs:[e.inputs[1],e.inputs[2]],outputs:[]})}}),ml,gl,_l,oa,yl,bl,wl,$l,vl,xl,Cl,Tl,ua,kl,Sl,Il,El,zl,lf,df,pg=q(()=>{re(),ne(),xe(),oe(),ml=(e,t)=>{if(e.every(i=>i>0||(()=>{throw new Error("Resize requires scales input values to be positive")})),e.length>0){if(t.mode==="linear"){if(!(e.length===2||e.length===3||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1||e.length===5&&e[0]===1&&e[1]===1))throw new Error(`For linear mode, Resize requires scales to be 2D, 3D, 4D with either two outermost or one innermost and
            one outermost scale values equal to 1, or 5D with two outermost scale values equal to 1`)}else if(t.mode==="cubic"&&!(e.length===2||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1))throw new Error("Resize requires scales input size to be 2 or 4 for cubic mode")}},gl=(e,t,i)=>{t.every(n=>n>=0&&n<i||(()=>{throw new Error("Resize requires axes input values to be positive and less than rank")}));let a=new Array(i).fill(1);return t.forEach((n,r)=>a[n]=e[r]),a},_l=(e,t,i,a,n,r)=>{let[o,u,p]=i>10?[1,2,3]:[-1,e.length>1?1:-1,-1],d=e[0].dims.length;if(o>0&&e.length>o&&e[o].dims.length>0)e[o].getFloat32Array().forEach(f=>r.push(f));else if(t.coordinateTransformMode==="tf_crop_and_resize")throw new Error("Resize requires RoI input to be specified when coordinateTransformMode is tfCropAndResize");if(u>0&&e.length>u&&e[u].dims.length===1&&e[u].dims[0]>0){if(e[u].getFloat32Array().forEach(f=>a.push(f)),a.length!==0&&a.length!==d&&i>=18&&a.length!==t.axes.length)throw new Error("Resize requires scales input size to be same as input rank or axes size for opset 18 and up");ml(a,t),t.axes.length>0&&gl(a,t.axes,d).forEach((f,m)=>a[m]=f)}if(p>0&&e.length>p&&e[p].dims.length===1&&e[p].dims[0]>0&&(e[p].getBigInt64Array().forEach(f=>n.push(Number(f))),n.length!==0&&n.length!==d&&i>=18&&n.length!==t.axes.length))throw new Error("Resize requires sizes input size to be same as input rank or axes size for opset 18 and up");if(t.axes.length>0){if(a.length!==0&&a.length!==t.axes.length)throw new Error('Resize requires "scales" input size to be of axes rank when axes attributes is specified');if(n.length!==0&&n.length!==t.axes.length)throw new Error('Resize requires "sizes" input size to be of rank axes rank when axes attributes is specified')}if(typeof a<"u"&&typeof n<"u"&&a.length>0&&n.length>d)throw new Error("Resize requires only of scales or sizes to be specified")},oa=(e,t,i,a)=>`
  // The whole part and the fractional part are calculated separately due to inaccuracy of floating
  // point division. As an example, f32(21) / f32(7) may evaluate to 2.99... instead of 3, causing an
  // offset-by-one error later in floor().
  let big = (${e}) * (${t});
  let whole = ${a}(big / (${i}));
  let fract = ${a}(big % (${i})) / ${a}(${i});
  return whole + fract;
`,yl=(e,t)=>`fn getOriginalCoordinateFromResizedCoordinate(xResized: u32, xScale: f32, lengthResized: u32,
     lengthOriginal: u32, roiStart: f32, roiEnd: f32) -> ${t} { `+(()=>{switch(e){case"asymmetric":return`
          if (xScale < 1.0 || floor(xScale) != xScale) {
            return ${t}(xResized) / ${t}(xScale);
          } else {
            ${oa("xResized","lengthOriginal","lengthResized",t)}
          }
        `;case"pytorch_half_pixel":return`if (lengthResized > 1) {
                    return (${t}(xResized) + 0.5) / ${t}(xScale) - 0.5;
                  } else {
                    return 0.0;
                  }`;case"tf_half_pixel_for_nn":return`return (${t}(xResized) + 0.5) / ${t}(xScale);`;case"align_corners":return`if (lengthResized == 1) {
                    return 0.0;
                  } else {
                    ${oa("xResized","lengthOriginal - 1","lengthResized - 1",t)}
                  }`;case"tf_crop_and_resize":return`if (lengthResized > 1) {
                    return ${t}(roiStart) * ${t}(lengthOriginal - 1) +
                        (${t}(xResized) * ${t}(roiEnd - roiStart) * ${t}(lengthOriginal - 1)) /
                        ${t}(lengthResized - 1);
                  } else {
                    return 0.5 * ${t}(roiStart + roiEnd) * ${t}(lengthOriginal - 1);
                  }`;case"half_pixel_symmetric":return`const outputWidth = ${t}xScale * ${t}(lengthResized);
                  const adjustment = ${t}(lengthResized) / outputWidth;
                  const center = ${t}(lengthOriginal) / 2;
                  const offset = center * (1 - adjustment);
                  return offset + ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;case"half_pixel":return`return ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;default:throw new Error(`Coordinate transform mode ${e} is not supported`)}})()+"}",bl=(e,t,i)=>`fn getNearestPixelFromOriginal(xOriginal: ${i}, isDownSample: bool) -> ${i} {`+(()=>{switch(e){case"round_prefer_ceil":return"if (fract(xOriginal) == 0.5) {             return ceil(xOriginal);           } else {             return round(xOriginal);           }";case"floor":return"return floor(xOriginal);";case"ceil":return"return ceil(xOriginal);";case"round_prefer_floor":return"if (fract(xOriginal) == 0.5) {                     return floor(xOriginal);                   } else {                     return round(xOriginal);                   }";case"simple":default:if(t<11)return"if (isDownSample)                     {                       return ceil(xOriginal);                     } else {                       return xOriginal;                     }";throw new Error(`Nearest mode ${e} is not supported`)}})()+"}",wl=(e,t,i)=>{let a=new Array(i).fill(0).concat(new Array(i).fill(1)),n=e.length===0?a:e.slice();return t.length>0?(t.forEach((r,o)=>{a[r]=n[o],a[o+i]=n[t.length+o]}),a):n},$l=(e,t,i,a)=>{let n=[];if(i.length>0)if(a.length>0){if(e.forEach(r=>n.push(r)),Math.max(...a)>e.length)throw new Error("axes is out of bound");a.forEach((r,o)=>n[r]=i[o])}else i.forEach(r=>n.push(r));else{if(t.length===0)throw new Error("Resize requires either scales or sizes.");n=e.map((r,o)=>Math.round(r*t[o]))}return n},vl=(e,t,i)=>{let a=(()=>{switch(i.keepAspectRatioPolicy){case"not_larger":return i.axes.length>0?Math.min(...i.axes.map(r=>t[r]),Number.MAX_VALUE):Math.min(...t,Number.MAX_VALUE);case"not_smaller":return i.axes.length>0?Math.max(...i.axes.map(r=>t[r]),Number.MIN_VALUE):Math.max(...t,Number.MIN_VALUE);default:throw new Error(`Keep aspect ratio policy ${i.keepAspectRatioPolicy} is not supported`)}})();t.fill(1,0,t.length);let n=e.slice();return i.axes.length>0?(i.axes.forEach(r=>t[r]=a),i.axes.forEach(r=>n[r]=Math.round(e[r]*t[r]))):(t.fill(a,0,t.length),n.forEach((r,o)=>n[o]=Math.round(r*t[o]))),n},xl=(e,t,i,a,n)=>`
    fn calculateOriginalIndicesFromOutputIndices(output_indices: ${e.type.indices}) -> array<${e.type.value}, ${i.length}> {
      var original_indices: array<${e.type.value}, ${i.length}>;
      for (var i:u32 = 0; i < ${i.length}; i++) {
        var output_index = ${e.indicesGet("output_indices","i")};
        var scale = ${X("uniforms.scales","i",a)};
        var roi_low = ${X("uniforms.roi","i",n)};
        var roi_hi = ${X("uniforms.roi",`i + ${t.length}`,n)};
        if (scale == 1.0) {
          original_indices[i] = ${e.type.value}(output_index);
        } else {
          var input_shape_i = ${X("uniforms.input_shape","i",t.length)};
          var output_shape_i = ${X("uniforms.output_shape","i",i.length)};
          original_indices[i] = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                           input_shape_i, roi_low, roi_hi);
        }
      }
      return original_indices;
    }`,Cl=(e,t,i,a,n,r,o)=>`
    fn calculateInputIndicesFromOutputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
      var input_indices: ${e.type.indices};
      for (var i:u32 = 0; i < ${a.length}; i++) {
        var output_index = ${t.indicesGet("output_indices","i")};
        var input_index: u32;
        var scale = ${X("uniforms.scales","i",n)};
        if (scale == 1.0) {
          input_index = output_index;
        } else {
          var roi_low = ${X("uniforms.roi","i",r)};
          var roi_hi = ${X("uniforms.roi",`i + ${i.length}`,r)};
          var input_shape_i = ${X("uniforms.input_shape","i",i.length)};
          var output_shape_i = ${X("uniforms.output_shape","i",a.length)};
          var original_idx = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                        input_shape_i, roi_low, roi_hi);
          if (!${o} || (original_idx >= 0 && original_idx < ${t.type.value}(input_shape_i))) {
            if (original_idx < 0) {
              input_index = 0;
            } else if (original_idx > ${t.type.value}(input_shape_i - 1)) {
              input_index = input_shape_i - 1;
            } else {
              input_index = u32(getNearestPixelFromOriginal(original_idx, scale < 1));
            }
          } else {
            input_index = u32(original_idx);
          }
        }
        ${e.indicesSet("input_indices","i","input_index")}
      }
      return input_indices;
    }`,Tl=(e,t)=>`
    fn checkInputIndices(input_indices: ${e.type.indices}) -> bool {
      for (var i:u32 = 0; i < ${t.length}; i++) {
        var input_index = ${e.indicesGet("input_indices","i")};
        if (input_index < 0 || input_index >= ${X("uniforms.input_shape","i",t.length)}) {
          return false;
        }
      }
      return true;
    }`,ua=(e,t,i,a)=>e.rank>a?`
    ${e.indicesSet("input_indices",t,"channel")};
    ${e.indicesSet("input_indices",i,"batch")};
`:"",kl=(e,t,i,a,n)=>{let[r,o,u,p]=i.length===2?[-1,0,1,-1]:[0,2,3,1],d=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, row: u32, col: u32) -> ${d} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",o,`max(0, min(row, ${i[o]} - 1))`)};
      ${e.indicesSet("input_indices",u,`max(0, min(col, ${i[u]} - 1))`)};
      ${ua(e,p,r,2)}
      return ${e.getByIndices("input_indices")};
    }

    fn bilinearInterpolation(output_indices: ${t.type.indices}) -> ${d} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var row:${d} = originalIndices[${o}];
      var col:${d} = originalIndices[${u}];
      ${a?`if (row < 0 || row > (${i[o]} - 1) || col < 0 || col > (${i[u]} - 1)) {
        return ${n};
      }`:""};
      row = max(0, min(row, ${i[o]} - 1));
      col = max(0, min(col, ${i[u]} - 1));
      var row1: u32 = u32(row);
      var col1: u32 = u32(col);
      var row2: u32 = u32(row + 1);
      var col2: u32 = u32(col + 1);
      var channel: u32 = ${i.length>2?`u32(originalIndices[${p}])`:"0"};
      var batch: u32 =  ${i.length>2?`u32(originalIndices[${r}])`:"0"};
      var x11: ${d} = getInputValue(batch, channel, row1, col1);
      var x12: ${d} = getInputValue(batch, channel, row1, col2);
      var x21: ${d} = getInputValue(batch, channel, row2, col1);
      var x22: ${d} = getInputValue(batch, channel, row2, col2);
      var dx1: ${d} = abs(row - ${d}(row1));
      var dx2: ${d} = abs(${d}(row2) - row);
      var dy1: ${d} = abs(col - ${d}(col1));
      var dy2: ${d} = abs(${d}(col2) - col);
      if (row1 == row2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (col1 == col2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      return (x11 * dx2 * dy2 + x12 * dx2 * dy1 + x21 * dx1 * dy2 + x22 * dx1 * dy1);
    }`},Sl=(e,t,i,a,n,r,o,u,p,d)=>{let f=i.length===2,[m,g]=f?[0,1]:[2,3],_=e.type.value,b=w=>{let C=w===m?"row":"col";return`
      fn ${C}CubicInterpolation(input_indices: ${e.type.indices}, output_indices: ${t.type.indices}) -> ${_} {
        var output_index = ${t.indicesGet("output_indices",w)};
        var originalIdx: ${_} = getOriginalCoordinateFromResizedCoordinate(output_index, ${n[w]},
        ${a[w]}, ${i[w]}, ${r[w]}, ${r[w]} + ${i.length});
        var fractOriginalIdx: ${_} = originalIdx - floor(originalIdx);
        var coefs = getCubicInterpolationCoefs(fractOriginalIdx);

        if (${u} && (originalIdx < 0 || originalIdx > (${i[w]} - 1))) {
          return ${p};
        }
        var data: array<${_}, 4> = array<${_}, 4>(0.0, 0.0, 0.0, 0.0);
        for (var i: i32 = -1; i < 3; i++) {
          var ${C}: ${_} = originalIdx + ${_}(i);
          if (${C} < 0 || ${C} >= ${i[w]}) {
            ${d?`coefs[i + 1] = 0.0;
                        continue;`:u?`return ${p};`:`${C} = max(0, min(${C}, ${i[w]} - 1));`};
          }
        var input_indices_copy: ${e.type.indices} = input_indices;
          ${e.indicesSet("input_indices_copy",w,`u32(${C})`)};
          data[i + 1] = ${w===m?e.getByIndices("input_indices_copy"):"rowCubicInterpolation(input_indices_copy, output_indices)"};
        }
        return cubicInterpolation1D(data, coefs);
      }`};return`
    ${b(m)};
    ${b(g)};
  fn getCubicInterpolationCoefs(s: ${_}) -> array<${_}, 4> {
    var absS = abs(s);
    var coeffs: array<${_}, 4> = array<${_}, 4>(0.0, 0.0, 0.0, 0.0);
    var oneMinusAbsS: ${_} = 1.0 - absS;
    var twoMinusAbsS: ${_} = 2.0 - absS;
    var onePlusAbsS: ${_} = 1.0 + absS;
    coeffs[0] = ((${o} * onePlusAbsS - 5 * ${o}) * onePlusAbsS + 8 * ${o}) * onePlusAbsS - 4 * ${o};
    coeffs[1] = ((${o} + 2) * absS - (${o} + 3)) * absS * absS + 1;
    coeffs[2] = ((${o} + 2) * oneMinusAbsS - (${o} + 3)) * oneMinusAbsS * oneMinusAbsS + 1;
    coeffs[3] = ((${o} * twoMinusAbsS - 5 * ${o}) * twoMinusAbsS + 8 * ${o}) * twoMinusAbsS - 4 * ${o};
    return coeffs;
  }

  fn cubicInterpolation1D(x: array<${_}, 4>, coefs: array<${_}, 4>) -> ${_} {
    var coefsSum: ${_} = coefs[0] + coefs[1] + coefs[2] + coefs[3];
    return (x[0] * coefs[0] + x[1] * coefs[1]+ x[2] * coefs[2]+ x[3] * coefs[3]) / coefsSum;
  }

  fn bicubicInterpolation(output_indices: ${t.type.indices}) -> ${_} {
    var input_indices: ${e.type.indices} = output_indices;
    return colCubicInterpolation(input_indices, output_indices);
  }
    `},Il=(e,t,i,a,n)=>{let[r,o,u,p,d]=i.length===3?[-1,0,1,2,-1]:[0,2,3,4,1],f=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, depth:u32, height: u32, width: u32) -> ${f} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",o,`max(0, min(depth, ${i[o]} - 1))`)};
      ${e.indicesSet("input_indices",u,`max(0, min(height, ${i[u]} - 1))`)};
      ${e.indicesSet("input_indices",p,`max(0, min(width, ${i[p]} - 1))`)};
      ${ua(e,d,r,3)}
      return ${e.getByIndices("input_indices")};
    }

    fn trilinearInterpolation(output_indices: ${t.type.indices}) -> ${f} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var depth:${f} = originalIndices[${o}];
      var height:${f} = originalIndices[${u}];
      var width:${f} = originalIndices[${p}];
      ${a?`if (depth < 0 || depth > (${i[o]} - 1) || height < 0 || height > (${i[u]} - 1) || width < 0 || (width > ${i[p]} - 1)) {
      return ${n};
        }`:""};

    depth = max(0, min(depth, ${i[o]} - 1));
      height = max(0, min(height, ${i[u]} - 1));
      width = max(0, min(width, ${i[p]} - 1));
      var depth1: u32 = u32(depth);
      var height1: u32 = u32(height);
      var width1: u32 = u32(width);
      var depth2: u32 = u32(depth + 1);
      var height2: u32 = u32(height + 1);
      var width2: u32 = u32(width + 1);
      var channel: u32 = ${i.length>3?`u32(originalIndices[${d}])`:"0"};
      var batch: u32 =  ${i.length>3?`u32(originalIndices[${r}])`:"0"};

      var x111: ${f} = getInputValue(batch, channel, depth1, height1, width1);
      var x112: ${f} = getInputValue(batch, channel, depth1, height1, width2);
      var x121: ${f} = getInputValue(batch, channel, depth1, height2, width1);
      var x122: ${f} = getInputValue(batch, channel, depth1, height2, width2);
      var x211: ${f} = getInputValue(batch, channel, depth2, height1, width1);
      var x212: ${f} = getInputValue(batch, channel, depth2, height1, width2);
      var x221: ${f} = getInputValue(batch, channel, depth2, height2, width1);
      var x222: ${f} = getInputValue(batch, channel, depth2, height2, width2);
      var dx1: ${f} = abs(depth - ${f}(depth1));
      var dx2: ${f} = abs(${f}(depth2) - depth);
      var dy1: ${f} = abs(height - ${f}(height1));
      var dy2: ${f} = abs(${f}(height2) - height);
      var dz1: ${f} = abs(width - ${f}(width1));
      var dz2: ${f} = abs(${f}(width2) - width);
      if (depth1 == depth2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (height1 == height2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      if (width1 == width2) {
        dz1 = 0.5;
        dz2 = 0.5;
      }
      return (x111 * dx2 * dy2 * dz2 + x112 * dx2 * dy2 * dz1 + x121 * dx2 * dy1 *dz2 + x122 * dx2 * dy1 * dz1 +
              x211 * dx1 * dy2 * dz2 + x212 * dx1 * dy2 * dz1 + x221 * dx1 * dy1 *dz2 + x222 * dx1 * dy1 * dz1);
    }`},El=(e,t,i,a,n,r)=>{let o=e.dims,u=wl(r,t.axes,o.length),p=$l(o,a,n,t.axes),d=a.slice();a.length===0&&(d=o.map(($,T)=>$===0?1:p[T]/$),t.keepAspectRatioPolicy!=="stretch"&&(p=vl(o,d,t)));let f=K("output",e.dataType,p.length),m=N("input",e.dataType,o.length),g=O.size(p),_=o.length===p.length&&o.every(($,T)=>$===p[T]),b=t.coordinateTransformMode==="tf_crop_and_resize",w=t.extrapolationValue,C=m.type.value,v=$=>`
      ${_?"":`
      ${yl(t.coordinateTransformMode,C)};
      ${(()=>{switch(t.mode){case"nearest":return`
              ${Tl(m,o)};
              ${bl(t.nearestMode,i,C)};
              ${Cl(m,f,o,p,d.length,u.length,b)};
              `;case"linear":return`
              ${xl(f,o,p,d.length,u.length)};
              ${(()=>{if(o.length===2||o.length===4)return`${kl(m,f,o,b,w)}`;if(o.length===3||o.length===5)return`${Il(m,f,o,b,w)}`;throw Error("Linear mode only supports input dims 2, 3, 4 and 5 are supported in linear mode.")})()};
            `;case"cubic":return`
            ${(()=>{if(o.length===2||o.length===4)return`${Sl(m,f,o,p,d,u,t.cubicCoeffA,b,t.extrapolationValue,t.excludeOutside)}`;throw Error("Cubic mode only supports input dims 2 and 4 are supported in linear mode.")})()};
            `;default:throw Error("Invalid resize mode")}})()};
      `}
      ${$.registerUniform("output_size","u32").registerUniform("scales","f32",d.length).registerUniform("roi","f32",u.length).declareVariables(m,f)}
      ${$.mainStart()}
        ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
        ${_?"output[global_idx] = input[global_idx];":`
        let output_indices = ${f.offsetToIndices("global_idx")};
        var input_indices: ${m.type.indices};
        ${(()=>{switch(t.mode){case"nearest":return`input_indices = calculateInputIndicesFromOutputIndices(output_indices);
                if (checkInputIndices(input_indices)) {
                  output[global_idx] = ${m.getByIndices("input_indices")};
                } else {
                  output[global_idx] = ${t.extrapolationValue};
                }`;case"linear":return`output[global_idx] = ${o.length===2||o.length===4?"bilinearInterpolation":"trilinearInterpolation"}(output_indices);`;case"cubic":return"output[global_idx] = bicubicInterpolation(output_indices);";default:throw Error(`Unsupported resize mode: ${t.mode}`)}})()};
`}
      }`;return{name:"Resize",shaderCache:{hint:`${t.cacheKey}|${i}|${d.length>0?t.mode==="cubic"?d:d.length:""}|${n.length>0?n:""}|${u.length>0?u:""}|${_}|${t.mode==="nearest"?o.length:o}`,inputDependencies:["rank"]},getShaderSource:v,getRunData:()=>({outputs:[{dims:p,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(g/64)},programUniforms:[{type:12,data:g},{type:1,data:d},{type:1,data:u},...Q(o,p)]})}},zl=e=>{let t=e.customDataBuffer;return new Uint32Array(t,t.byteOffset,1)[0]},lf=(e,t)=>{let i=[],a=[],n=[],r=zl(e);if(t.antialias!==0)throw Error("Only default value (0) for Antialias attribute is supported");_l(e.inputs,t,r,i,a,n),e.compute(El(e.inputs[0],t,r,i,a,n),{inputs:[0]})},df=e=>{let t=e.antialias,i=e.axes,a=e.coordinateTransformMode,n=e.cubicCoeffA,r=e.excludeOutside!==0,o=e.extrapolationValue,u=e.keepAspectRatioPolicy,p=e.mode,d=e.nearestMode===""?"simple":e.nearestMode;return fe({antialias:t,axes:i,coordinateTransformMode:a,cubicCoeffA:n,excludeOutside:r,extrapolationValue:o,keepAspectRatioPolicy:u,mode:p,nearestMode:d})}}),Al,Ol,pf,cg=q(()=>{re(),ne(),oe(),Al=e=>{if(!e||e.length<3)throw new Error("layerNorm requires at least 3 inputs.");let t=e[0],i=e[1],a=e[2];if(t.dataType!==i.dataType||t.dataType!==a.dataType)throw new Error("All inputs must have the same data type");if(t.dims.length!==3&&t.dims.length!==2)throw new Error("Input must be 2D or 3D");if(i.dims.length!==3&&i.dims.length!==2)throw new Error("Skip must be 2D or 3D");let n=t.dims[t.dims.length-1],r=t.dims[t.dims.length-2];if(i.dims[i.dims.length-1]!==n)throw new Error("Skip must have the same hidden size as input");if(i.dims[i.dims.length-2]!==r)throw new Error("Skip must have the same sequence length as input");if(a.dims.length!==1)throw new Error("Gamma must be 1D");if(a.dims[a.dims.length-1]!==n)throw new Error("Gamma must have the same hidden size as input");if(e.length>3){let o=e[3];if(o.dims.length!==1)throw new Error("Beta must be 1D");if(o.dims[o.dims.length-1]!==n)throw new Error("Beta must have the same hidden size as input")}if(e.length>4){let o=e[4];if(o.dims.length!==1)throw new Error("Bias must be 1D");if(o.dims[o.dims.length-1]!==n)throw new Error("Bias must have the same hidden size as input")}},Ol=(e,t,i,a)=>{let n=t.simplified,r=e[0].dims,o=O.size(r),u=r,p=o,d=r.slice(-1)[0],f=a?r.slice(0,-1).concat(1):[],m=!n&&e.length>3,g=e.length>4,_=a&&i>1,b=a&&i>2,w=i>3,C=64,v=ve(d),$=[{type:12,data:p},{type:12,data:v},{type:12,data:d},{type:1,data:t.epsilon}],T=S=>{let E=[{name:"output_size",type:"u32"},{name:"components",type:"u32"},{name:"hidden_size",type:"u32"},{name:"epsilon",type:"f32"}],z=[N("x",e[0].dataType,e[0].dims,v),N("skip",e[1].dataType,e[1].dims,v),N("gamma",e[2].dataType,e[2].dims,v)];m&&z.push(N("beta",e[3].dataType,e[3].dims,v)),g&&z.push(N("bias",e[4].dataType,e[4].dims,v)),z.push(K("output",e[0].dataType,u,v)),_&&z.push(K("mean_output",1,f)),b&&z.push(K("inv_std_output",1,f)),w&&z.push(K("input_skip_bias_sum",e[0].dataType,u,v));let R=Se(e[0].dataType),M=Se(1,v);return`

      ${S.registerUniforms(E).declareVariables(...z)}
      var<workgroup> sum_shared : array<${M}, ${C}>;
      var<workgroup> sum_squared_shared : array<${M}, ${C}>;

      ${S.mainStart([C,1,1])}
        let ix = local_id.x;
        let iy = global_id.x / ${C};

        let hidden_size_vectorized: u32 = uniforms.hidden_size / uniforms.components;
        var stride = hidden_size_vectorized / ${C};
        let offset = ix * stride + iy * hidden_size_vectorized;
        let offset1d = stride * ix;
        if (ix == ${C-1}) {
          stride = hidden_size_vectorized - stride * ix;
        }
        for (var i: u32 = 0; i < stride; i++) {
          let skip_value = skip[offset + i];
          let bias_value = ${g?"bias[offset1d + i]":R+"(0.0)"};
          let input_value = x[offset + i];
          let value = input_value + skip_value + bias_value;
          ${w?"input_skip_bias_sum[offset + i] = value;":""}
          output[offset + i] = value;
          let f32_value = ${Lt(R,v,"value")};
          sum_shared[ix] += f32_value;
          sum_squared_shared[ix] += f32_value * f32_value;
        }
        workgroupBarrier();

        var reduce_size : u32 = ${C};
        for (var curr_size = reduce_size >> 1;  curr_size > 0; curr_size = reduce_size >> 1) {
          reduce_size = curr_size + (reduce_size & 1);
          if (ix < curr_size) {
            sum_shared[ix] += sum_shared[ix + reduce_size];
            sum_squared_shared[ix] += sum_squared_shared[ix + reduce_size];
          }
          workgroupBarrier();
        }

        let sum = sum_shared[0];
        let square_sum = sum_squared_shared[0];
        let mean = ${yt("sum",v)} / f32(uniforms.hidden_size);
        let inv_std_dev = inverseSqrt(${yt("square_sum",v)} / f32(uniforms.hidden_size) ${n?"":"- mean * mean"} + uniforms.epsilon);
        ${_?"mean_output[global_idx] = mean;":""}
        ${b?"inv_std_output[global_idx] = inv_std_dev;":""}

        for (var i: u32 = 0; i < stride; i++) {
          output[offset + i] = (output[offset + i] ${n?"":`- ${R}(mean)`}) *
            ${R}(inv_std_dev) * gamma[offset1d + i]
            ${m?"+ beta[offset1d + i]":""};
        }
      }`},k=[{dims:u,dataType:e[0].dataType}];return i>1&&k.push({dims:f,dataType:1}),i>2&&k.push({dims:f,dataType:1}),i>3&&k.push({dims:r,dataType:e[0].dataType}),{name:"SkipLayerNormalization",shaderCache:{hint:`${v};${_};${b};${w}`,inputDependencies:e.map((S,E)=>"type")},getShaderSource:T,getRunData:()=>({outputs:k,dispatchGroup:{x:Math.ceil(p/d)},programUniforms:$})}},pf=(e,t)=>{Al(e.inputs);let i=[0];e.outputCount>1&&i.push(-3),e.outputCount>2&&i.push(-3),e.outputCount>3&&i.push(3),e.compute(Ol(e.inputs,t,e.outputCount,!1),{outputs:i})}}),Rl,ai,Bl,la,Nl,Dl,cf,ff,fg=q(()=>{re(),ne(),xe(),oe(),Rl=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");if(t.axes.length!==0){if(t.axes.length!==t.starts.length||t.axes.length!==t.ends.length)throw new Error("axes, starts and ends must have the same length")}else if(t.starts.length!==t.ends.length)throw new Error("starts and ends must have the same length");e.slice(1).forEach((i,a)=>{if(e[a+1].dataType!==6&&e[a+1].dataType!==7)throw new Error(`Input ${a} must be an array of int32 or int64`)})},ai=(e,t)=>{let i=[];if(e.length>t)if(e[t].dataType===7)e[t].getBigInt64Array().forEach(a=>i.push(Number(a)));else if(e[t].dataType===6)e[t].getInt32Array().forEach(a=>i.push(Number(a)));else throw new Error(`Input ${t} must be an array of int32 or int64`);return i},Bl=(e,t)=>{if(e.length>1){let i=ai(e,1),a=ai(e,2),n=ai(e,3);return n.length===0&&(n=[...Array(e[0].dims.length).keys()]),fe({starts:i,ends:a,axes:n})}else return t},la=(e,t,i,a,n)=>{let r=e;return e<0&&(r+=i[a[t]]),n[t]<0?Math.max(0,Math.min(r,i[a[t]]-1)):Math.max(0,Math.min(r,i[a[t]]))},Nl=(e,t,i)=>`fn calculateInputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
          var input_indices: ${e.type.indices};
          var carry = 0u;
          for (var i = ${i.length-1}; i >= 0; i--) {
            let input_shape_i = ${X("uniforms.input_shape","i",i.length)};
            let steps_i = ${X("uniforms.steps","i",i.length)};
            let signs_i = ${X("uniforms.signs","i",i.length)};
            let starts_i = ${X("uniforms.starts","i",i.length)};
            var output_index = ${t.indicesGet("output_indices","i")};
            var input_index = output_index * steps_i + starts_i + carry;
            carry = input_index / input_shape_i;
            input_index = input_index % input_shape_i;
            if (signs_i < 0) {
              input_index = input_shape_i - input_index - 1u + starts_i;
            }
            ${e.indicesSet("input_indices","i","input_index")};
          }
          return input_indices;
      }`,Dl=(e,t)=>{let i=e[0].dims,a=O.size(i),n=t.axes.length>0?O.normalizeAxes(t.axes,i.length):[...Array(i.length).keys()],r=ai(e,4);r.forEach(v=>v!==0||(()=>{throw new Error("step cannot be 0")})),r.length===0&&(r=Array(n.length).fill(1));let o=t.starts.map((v,$)=>la(v,$,i,n,r)),u=t.ends.map((v,$)=>la(v,$,i,n,r));if(n.length!==o.length||n.length!==u.length)throw new Error("start, ends and axes should have the same number of elements");if(n.length!==i.length)for(let v=0;v<i.length;++v)n.includes(v)||(o.splice(v,0,0),u.splice(v,0,i[v]),r.splice(v,0,1));let p=r.map(v=>Math.sign(v));r.forEach((v,$,T)=>{if(v<0){let k=(u[$]-o[$])/v,S=o[$],E=S+k*r[$];o[$]=E,u[$]=S,T[$]=-v}});let d=i.slice(0);n.forEach((v,$)=>{d[v]=Math.ceil((u[v]-o[v])/r[v])});let f={dims:d,dataType:e[0].dataType},m=K("output",e[0].dataType,d.length),g=N("input",e[0].dataType,e[0].dims.length),_=O.size(d),b=[{name:"outputSize",type:"u32"},{name:"starts",type:"u32",length:o.length},{name:"signs",type:"i32",length:p.length},{name:"steps",type:"u32",length:r.length}],w=[{type:12,data:_},{type:12,data:o},{type:6,data:p},{type:12,data:r},...Q(e[0].dims,d)],C=v=>`
      ${v.registerUniforms(b).declareVariables(g,m)}
        ${Nl(g,m,i)}
        ${v.mainStart()}
          ${v.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
          let output_indices = ${m.offsetToIndices("global_idx")};
          let input_indices = calculateInputIndices(output_indices);
          ${m.setByOffset("global_idx",g.getByIndices("input_indices"))}
      }`;return{name:"Slice",shaderCache:{hint:`${p.length}_${o.length}_${r.length}`,inputDependencies:["rank"]},getShaderSource:C,getRunData:()=>({outputs:[f],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:w})}},cf=(e,t)=>{Rl(e.inputs,t);let i=Bl(e.inputs,t);e.compute(Dl(e.inputs,i),{inputs:[0]})},ff=e=>{let t=e.starts,i=e.ends,a=e.axes;return fe({starts:t,ends:i,axes:a})}}),Ml,Pl,hf,mf,hg=q(()=>{re(),ne(),xe(),bt(),oe(),Ml=e=>{if(!e||e.length!==1)throw new Error("Softmax op requires 1 input.")},Pl=(e,t)=>{let i=e.inputs[0],a=i.dims,n=O.size(a),r=a.length,o=O.normalizeAxis(t.axis,r),u=o<a.length-1,p,d=[];u?(d=Array.from({length:r},(z,R)=>R),d[o]=r-1,d[r-1]=o,p=e.compute(qe(i,d),{inputs:[i],outputs:[-1]})[0]):p=i;let f=p.dims,m=f[r-1],g=n/m,_=ve(m),b=m/_,w=64;g===1&&(w=256);let C=(z,R)=>R===4?`max(max(${z}.x, ${z}.y), max(${z}.z, ${z}.w))`:R===2?`max(${z}.x, ${z}.y)`:R===3?`max(max(${z}.x, ${z}.y), ${z}.z)`:z,v=N("x",p.dataType,p.dims,_),$=K("result",p.dataType,p.dims,_),T=v.type.value,k=Se(p.dataType)==="f32"?`var threadMax = ${T}(-3.402823e+38f);`:`var threadMax = ${T}(-65504.0h);`,S=z=>`
      var<workgroup> rowMaxShared : ${T};
      var<workgroup> rowSumShared : ${T};
      var<workgroup> threadShared : array<${T}, ${w}>;

      fn getValue(row: i32, col: i32, row_stride: i32) -> ${T} {
        let index = row * row_stride + col;
        return x[index];
      }

      fn setValue(row: i32, col: i32, row_stride: i32, value: ${T}) {
        let index = row * row_stride + col;
        result[index] = value;
      }
      ${z.registerUniform("packedCols","i32").declareVariables(v,$)}
      ${z.mainStart(w)}
        let gindex = i32(global_idx);
        let lindex = i32(local_idx);
        const wg = ${w};
        let row = gindex / wg;
        let cols = uniforms.packedCols;
        let row_stride : i32 = uniforms.packedCols;

        // find the rows max
        ${k}
        for (var col = lindex; col < cols; col += wg) {
          let value = getValue(row, col, row_stride);
          threadMax = max(threadMax, value);
        }
        if (lindex < cols) {
          threadShared[lindex] = threadMax;
        }
        workgroupBarrier();

        var reduceSize = min(cols, wg);
        for (var currSize = reduceSize >> 1;  currSize > 0; currSize = reduceSize >> 1) {
          reduceSize = currSize + (reduceSize & 1);
          if (lindex < currSize) {
            threadShared[lindex] = max(threadShared[lindex], threadShared[lindex + reduceSize]);
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowMaxShared = ${T}(${C("threadShared[0]",_)});
        }
        workgroupBarrier();

        // find the rows sum
        var threadSum = ${T}(0.0);
        for (var col = lindex; col < cols; col += wg) {
          let subExp = exp(getValue(row, col, row_stride) - rowMaxShared);
          threadSum += subExp;
        }
        threadShared[lindex] = threadSum;
        workgroupBarrier();

        for (var currSize = wg >> 1;  currSize > 0; currSize = currSize >> 1) {
          if (lindex < currSize) {
            threadShared[lindex] = threadShared[lindex] + threadShared[lindex + currSize];
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowSumShared = ${T}(${yt("threadShared[0]",_)});
        }
        workgroupBarrier();

        // calculate final value for each element in the row
        for (var col = lindex; col < cols; col += wg) {
          var value = exp(getValue(row, col, row_stride) - rowMaxShared) / rowSumShared;
          // max operation protects against NaN since all values should be >=0
          value = max(value, ${T}(0.0));
          setValue(row, col, row_stride, value);
        }
      }`,E=e.compute({name:"Softmax",shaderCache:{hint:`${_};${w}`,inputDependencies:["type"]},getRunData:()=>({outputs:[{dims:f,dataType:p.dataType}],dispatchGroup:{x:g},programUniforms:[{type:6,data:b}]}),getShaderSource:S},{inputs:[p],outputs:[u?-1:0]})[0];u&&e.compute(qe(E,d),{inputs:[E]})},hf=(e,t)=>{Ml(e.inputs),Pl(e,t)},mf=e=>fe({axis:e.axis})}),da,Ul,ql,Wl,gf,mg=q(()=>{re(),ne(),oe(),da=e=>Array.from(e.getBigInt64Array(),Number),Ul=e=>{if(!e||e.length!==2)throw new Error("Tile requires 2 inputs.");if(e[0].dataType!==1&&e[0].dataType!==10&&e[0].dataType!==6&&e[0].dataType!==12)throw new Error("Tile only support float, float16, int32, and uint32 data types");if(e[1].dataType!==7)throw new Error("Tile `repeats` input should be of int64 data type");if(e[1].dims.length!==1)throw new Error("Tile `repeats` input should be 1-D");if(da(e[1]).length!==e[0].dims.length)throw new Error("Tile `repeats` input should have same number of elements as rank of input data tensor")},ql=(e,t)=>{let i=[];for(let a=0;a<e.length;++a)i.push(e[a]*t[a]);return i},Wl=(e,t)=>{let i=e[0].dims,a=t??da(e[1]),n=ql(i,a),r=O.size(n),o=e[0].dataType,u=N("input",o,i.length),p=K("output",o,n.length),d=f=>`
      const inputShape = ${u.indices(...i)};
      ${f.registerUniform("output_size","u32").declareVariables(u,p)}
      ${f.mainStart()}
      ${f.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let output_indices = ${p.offsetToIndices("global_idx")};
      var input_indices: ${u.type.indices};
      for (var i = 0; i < ${i.length}; i++) {
        let input_dim_i = ${u.indicesGet("uniforms.input_shape","i")};
        let input_dim_value = ${p.indicesGet("output_indices","i")}  % input_dim_i;

        ${u.indicesSet("input_indices","i","input_dim_value")}
      }
      ${p.setByOffset("global_idx",u.getByIndices("input_indices"))}
    }`;return{name:"Tile",shaderCache:{hint:`${a}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(r/64)},programUniforms:[{type:12,data:r},...Q(e[0].dims,n)]}),getShaderSource:d}},gf=e=>{Ul(e.inputs),e.compute(Wl(e.inputs),{inputs:[0]})}}),Ll,Vl,_f,gg=q(()=>{re(),ne(),oe(),Ll=(e,t,i,a,n)=>{let r=K("output_data",n,i.length,4),o=N("a_data",t[1].dataType,t[1].dims.length,4),u=N("b_data",t[2].dataType,t[2].dims.length,4),p=N("c_data",t[0].dataType,t[0].dims.length,4),d,f=(m,g,_)=>`select(${g}, ${m}, ${_})`;if(!a)d=r.setByOffset("global_idx",f(o.getByOffset("global_idx"),u.getByOffset("global_idx"),p.getByOffset("global_idx")));else{let m=(g,_,b="")=>{let w=`a_data[index_a${_}][component_a${_}]`,C=`b_data[index_b${_}][component_b${_}]`,v=`bool(c_data[index_c${_}] & (0xffu << (component_c${_} * 8)))`;return`
            let output_indices${_} = ${r.offsetToIndices(`global_idx * 4u + ${_}u`)};
            let offset_a${_} = ${o.broadcastedIndicesToOffset(`output_indices${_}`,r)};
            let offset_b${_} = ${u.broadcastedIndicesToOffset(`output_indices${_}`,r)};
            let offset_c${_} = ${p.broadcastedIndicesToOffset(`output_indices${_}`,r)};
            let index_a${_} = offset_a${_} / 4u;
            let index_b${_} = offset_b${_} / 4u;
            let index_c${_} = offset_c${_} / 4u;
            let component_a${_} = offset_a${_} % 4u;
            let component_b${_} = offset_b${_} % 4u;
            let component_c${_} = offset_c${_} % 4u;
            ${g}[${_}] = ${b}(${f(w,C,v)});
          `};n===9?d=`
            var data = vec4<u32>(0);
            ${m("data",0,"u32")}
            ${m("data",1,"u32")}
            ${m("data",2,"u32")}
            ${m("data",3,"u32")}
            output_data[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:d=`
            ${m("output_data[global_idx]",0)}
            ${m("output_data[global_idx]",1)}
            ${m("output_data[global_idx]",2)}
            ${m("output_data[global_idx]",3)}
          `}return`
        ${e.registerUniform("vec_size","u32").declareVariables(p,o,u,r)}
        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${d}
      }`},Vl=e=>{let t=e[1].dims,i=e[2].dims,a=e[0].dims,n=e[1].dataType,r=!(O.areEqual(t,i)&&O.areEqual(i,a)),o=t,u=O.size(t);if(r){let d=Vt.calcShape(Vt.calcShape(t,i,!1),a,!1);if(!d)throw new Error("Can't perform where op on the given tensors");o=d,u=O.size(o)}let p=Math.ceil(u/4);return{name:"Where",shaderCache:{inputDependencies:["rank","rank","rank"]},getShaderSource:d=>Ll(d,e,o,r,n),getRunData:()=>({outputs:[{dims:o,dataType:n}],dispatchGroup:{x:Math.ceil(u/64/4)},programUniforms:[{type:12,data:p},...Q(a,t,i,o)]})}},_f=e=>{e.compute(Vl(e.inputs))}}),yf,_g=q(()=>{Am(),Ga(),Om(),Rm(),Bm(),Nm(),Dm(),Wm(),Vm(),jm(),Gm(),Hm(),Fm(),Km(),Zm(),Ym(),Xm(),Qm(),Jm(),eg(),tg(),ig(),rg(),ag(),ng(),Dc(),sg(),og(),ug(),lg(),dg(),ja(),pg(),Wc(),cg(),fg(),hg(),Uc(),mg(),bt(),Ha(),gg(),yf=new Map([["Abs",[dp]],["Acos",[pp]],["Acosh",[cp]],["Add",[Hp]],["ArgMax",[sp,$a]],["ArgMin",[np,$a]],["Asin",[fp]],["Asinh",[hp]],["Atan",[mp]],["Atanh",[gp]],["Attention",[op]],["AveragePool",[Yc,Zc]],["BatchNormalization",[up]],["BiasAdd",[lp]],["BiasSplitGelu",[Gp]],["Cast",[yp,_p]],["Ceil",[wp]],["Clip",[bp]],["Concat",[ic,rc]],["Conv",[Sa,ka]],["ConvTranspose",[fc,cc]],["Cos",[$p]],["Cosh",[vp]],["CumSum",[hc,mc]],["DepthToSpace",[gc,_c]],["DequantizeLinear",[af,nf]],["Div",[Fp]],["Einsum",[yc,bc]],["Elu",[xp,li]],["Equal",[Kp]],["Erf",[Cp]],["Exp",[Tp]],["Expand",[wc]],["FastGelu",[$c]],["Floor",[kp]],["FusedConv",[Sa,ka]],["Gather",[xc,vc]],["GatherElements",[Ec,Ic]],["GatherBlockQuantized",[kc,Sc]],["GatherND",[Cc,Tc]],["Gelu",[Sp]],["Gemm",[Ac,zc]],["GlobalAveragePool",[Qc,Xc]],["GlobalMaxPool",[rf,tf]],["Greater",[Qp]],["GreaterOrEqual",[ec]],["GridSample",[Oc,Rc]],["GroupQueryAttention",[Lc]],["HardSigmoid",[Np,Bp]],["InstanceNormalization",[Vc]],["LayerNormalization",[jc]],["LeakyRelu",[Ip,li]],["Less",[Jp]],["LessOrEqual",[tc]],["Log",[Vp]],["MatMul",[Gc]],["MatMulNBits",[Hc,Fc]],["MaxPool",[Jc,ef]],["Mul",[Zp]],["MultiHeadAttention",[Nc,Bc]],["Neg",[zp]],["Not",[Ep]],["Pad",[Kc]],["Pow",[Yp]],["QuickGelu",[jp,li]],["Range",[sf]],["Reciprocal",[Ap]],["ReduceMin",[ep]],["ReduceMean",[Zd]],["ReduceMax",[Jd]],["ReduceSum",[ip]],["ReduceProd",[tp]],["ReduceL1",[Yd]],["ReduceL2",[Xd]],["ReduceLogSum",[ap]],["ReduceLogSumExp",[Qd]],["ReduceSumSquare",[rp]],["Relu",[Op]],["Resize",[lf,df]],["RotaryEmbedding",[qc]],["ScatterND",[uf,of]],["Sigmoid",[Rp]],["Sin",[Dp]],["Sinh",[Mp]],["Slice",[cf,ff]],["SkipLayerNormalization",[pf]],["Split",[Mc,Pc]],["Sqrt",[Pp]],["Softmax",[hf,mf]],["Sub",[Xp]],["Tan",[Up]],["Tanh",[qp]],["ThresholdedRelu",[Lp,li]],["Tile",[gf]],["Transpose",[Md,Pd]],["Where",[_f]]])}),bf,yg=q(()=>{Le(),lt(),oe(),bf=class{constructor(e){this.backend=e,this.repo=new Map,this.attributesBound=!1}getArtifact(e){return this.repo.get(e)}setArtifact(e,t){this.repo.set(e,t)}run(e,t,i,a,n){tt(e.programInfo.name);let r=this.backend.device,o=this.backend.getComputePassEncoder();this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2);let u=[];for(let d of t)u.push({binding:u.length,resource:{buffer:d.buffer}});for(let d of i)u.push({binding:u.length,resource:{buffer:d.buffer}});n&&u.push({binding:u.length,resource:n});let p=r.createBindGroup({layout:e.computePipeline.getBindGroupLayout(0),entries:u,label:e.programInfo.name});if(this.backend.sessionStatus==="capturing"){let d={kernelId:this.backend.currentKernelId,computePipeline:e.computePipeline,bindGroup:p,dispatchGroup:a};this.backend.capturedCommandList.get(this.backend.currentSessionId).push(d)}o.setPipeline(e.computePipeline),o.setBindGroup(0,p),o.dispatchWorkgroups(...a),this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2+1),this.backend.pendingDispatchNumber++,(this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber||this.backend.queryType==="at-passes")&&this.backend.endComputePass(),this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber&&this.backend.flush(),Ze(e.programInfo.name)}dispose(){}build(e,t){tt(e.name);let i=this.backend.device,a=[];[{feature:"shader-f16",extension:"f16"},{feature:"subgroups",extension:"subgroups"}].forEach(d=>{i.features.has(d.feature)&&a.push(`enable ${d.extension};`)});let n=Dd(t,this.backend.device.limits),r=e.getShaderSource(n),o=`${a.join(`
`)}
${n.additionalImplementations}
${r}`,u=i.createShaderModule({code:o,label:e.name});de("verbose",()=>`[WebGPU] ${e.name} shader code: ${o}`);let p=i.createComputePipeline({compute:{module:u,entryPoint:"main"},layout:"auto",label:e.name});return Ze(e.name),{programInfo:e,computePipeline:p,uniformVariablesInfo:n.variablesInfo}}normalizeDispatchGroupSize(e){let t=typeof e=="number"?e:e.x,i=typeof e=="number"?1:e.y||1,a=typeof e=="number"?1:e.z||1,n=this.backend.device.limits.maxComputeWorkgroupsPerDimension;if(t<=n&&i<=n&&a<=n)return[t,i,a];let r=t*i*a,o=Math.ceil(Math.sqrt(r));if(o>n){if(o=Math.ceil(Math.cbrt(r)),o>n)throw new Error("Total dispatch size exceeds WebGPU maximum.");return[o,o,o]}else return[o,o,1]}}}),wf={};Gt(wf,{WebGpuBackend:()=>$f});var jl,Gl,Hl,$f,bg=q(()=>{Le(),re(),lt(),Ad(),Em(),_g(),yg(),jl=(e,t)=>{if(t.length!==e.length)throw new Error(`inputDependencies length ${t.length} is not equal to inputTensors length ${e.length}.`);let i=[];for(let a=0;a<e.length;++a){let n=e[a].dataType;switch(t[a]){case"none":{i.push("");break}case"type":{i.push(`${n}`);break}case"rank":{let r=e[a].dims.length;i.push(`${n};${r}`);break}case"dims":{let r=e[a].dims.join(",");i.push(`${n};${r}`);break}default:throw new Error(`unsupported input dependency: ${t[a]}`)}}return i.join("|")},Gl=(e,t,i)=>{var n,r;let a=e.name;return(n=e.shaderCache)!=null&&n.hint&&(a+="["+e.shaderCache.hint+"]"),a+=":"+i+`:${jl(t,((r=e.shaderCache)==null?void 0:r.inputDependencies)??new Array(t.length).fill("dims"))}`,a},Hl=class{constructor(e){e&&(this.architecture=e.architecture,this.vendor=e.vendor)}isArchitecture(e){return this.architecture===e}isVendor(e){return this.vendor===e}},$f=class{constructor(){this.currentSessionId=null,this.currentKernelId=null,this.commandEncoder=null,this.computePassEncoder=null,this.maxDispatchNumber=16,this.pendingDispatchNumber=0,this.pendingKernels=[],this.pendingQueries=new Map,this.sessionStatus="default",this.capturedCommandList=new Map,this.capturedPendingKernels=new Map,this.sessionExternalDataMapping=new Map}get currentKernelCustomData(){if(this.currentKernelId===null)throw new Error("currentKernelCustomData(): currentKernelId is null. (should not happen)");let e=this.kernelCustomData.get(this.currentKernelId);return e||(e={},this.kernelCustomData.set(this.currentKernelId,e)),e}async initialize(e,t){this.env=e;let i=[],a={requiredLimits:{maxComputeWorkgroupStorageSize:t.limits.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:t.limits.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:t.limits.maxStorageBufferBindingSize,maxBufferSize:t.limits.maxBufferSize,maxComputeInvocationsPerWorkgroup:t.limits.maxComputeInvocationsPerWorkgroup,maxComputeWorkgroupSizeX:t.limits.maxComputeWorkgroupSizeX,maxComputeWorkgroupSizeY:t.limits.maxComputeWorkgroupSizeY,maxComputeWorkgroupSizeZ:t.limits.maxComputeWorkgroupSizeZ},requiredFeatures:i},n=r=>t.features.has(r)&&i.push(r)&&!0;n("chromium-experimental-timestamp-query-inside-passes")||n("timestamp-query"),n("shader-f16"),n("subgroups"),this.device=await t.requestDevice(a),this.adapterInfo=new Hl(t.info||await t.requestAdapterInfo()),this.gpuDataManager=Bd(this),this.programManager=new bf(this),this.kernels=new Map,this.kernelPersistentData=new Map,this.kernelCustomData=new Map,qa(e.logLevel,!!e.debug),this.device.onuncapturederror=r=>{r.error instanceof GPUValidationError&&console.error(`An uncaught WebGPU validation error was raised: ${r.error.message}`)},Object.defineProperty(this.env.webgpu,"device",{value:this.device,writable:!1,enumerable:!0,configurable:!1}),Object.defineProperty(this.env.webgpu,"adapter",{value:t,writable:!1,enumerable:!0,configurable:!1}),this.setQueryType()}dispose(){typeof this.querySet<"u"&&this.querySet.destroy(),this.gpuDataManager.dispose()}getCommandEncoder(){return this.commandEncoder||(this.commandEncoder=this.device.createCommandEncoder()),this.commandEncoder}getComputePassEncoder(){if(!this.computePassEncoder){let e=this.getCommandEncoder(),t={};this.queryType==="at-passes"&&(t.timestampWrites={querySet:this.querySet,beginningOfPassWriteIndex:this.pendingDispatchNumber*2,endOfPassWriteIndex:this.pendingDispatchNumber*2+1}),this.computePassEncoder=e.beginComputePass(t)}return this.computePassEncoder}endComputePass(){this.computePassEncoder&&(this.computePassEncoder.end(),this.computePassEncoder=null)}flush(){if(!this.commandEncoder)return;tt(),this.endComputePass();let e;this.queryType!=="none"&&(this.commandEncoder.resolveQuerySet(this.querySet,0,this.pendingDispatchNumber*2,this.queryResolveBuffer,0),e=this.device.createBuffer({size:this.pendingDispatchNumber*2*8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.pendingQueries.set(e,this.pendingKernels),this.pendingKernels=[],this.commandEncoder.copyBufferToBuffer(this.queryResolveBuffer,0,e,0,this.pendingDispatchNumber*2*8)),this.device.queue.submit([this.commandEncoder.finish()]),this.gpuDataManager.refreshPendingBuffers(),this.commandEncoder=null,this.pendingDispatchNumber=0,this.queryType!=="none"&&e.mapAsync(GPUMapMode.READ).then(()=>{var a;let t=new BigUint64Array(e.getMappedRange()),i=this.pendingQueries.get(e);for(let n=0;n<t.length/2;n++){let r=i[n],o=r.kernelId,u=this.kernels.get(o),p=u.kernelType,d=u.kernelName,f=r.programName,m=r.inputTensorViews,g=r.outputTensorViews,_=t[n*2],b=t[n*2+1];typeof this.queryTimeBase>"u"&&(this.queryTimeBase=_);let w=Number(_-this.queryTimeBase),C=Number(b-this.queryTimeBase);if(!Number.isSafeInteger(w)||!Number.isSafeInteger(C))throw new RangeError("incorrect timestamp range");if((a=this.env.webgpu.profiling)!=null&&a.ondata)this.env.webgpu.profiling.ondata({version:1,inputsMetadata:m.map(v=>({dims:v.dims,dataType:ut(v.dataType)})),outputsMetadata:g.map(v=>({dims:v.dims,dataType:ut(v.dataType)})),kernelId:o,kernelType:p,kernelName:d,programName:f,startTime:w,endTime:C});else{let v="";m.forEach((T,k)=>{v+=`input[${k}]: [${T.dims}] | ${ut(T.dataType)}, `});let $="";g.forEach((T,k)=>{$+=`output[${k}]: [${T.dims}] | ${ut(T.dataType)}, `}),console.log(`[profiling] kernel "${o}|${p}|${d}|${f}" ${v}${$}start time: ${w} ns, execution time: ${C-w} ns`)}Ui("GPU",`${f}::${_}::${b}`)}e.unmap(),this.pendingQueries.delete(e)}),Ze()}run(e,t,i,a,n,r){tt(e.name);let o=[];for(let $=0;$<t.length;++$){let T=t[$].data;if(T===0)continue;let k=this.gpuDataManager.get(T);if(!k)throw new Error(`no GPU data for input: ${T}`);o.push(k)}let{outputs:u,dispatchGroup:p,programUniforms:d}=e.getRunData(t),f=i.length===0?u.map(($,T)=>T):i;if(f.length!==u.length)throw new Error(`Output size ${f.length} must be equal to ${u.length}.`);let m=[],g=[];for(let $=0;$<u.length;++$){if(!Number.isInteger(f[$])||f[$]<-3||f[$]>=r)throw new Error(`Invalid output index: ${f[$]}`);if(f[$]===-3)continue;let T=f[$]===-1,k=f[$]===-2,S=T||k?n(u[$].dataType,u[$].dims):a(f[$],u[$].dataType,u[$].dims);if(m.push(S),S.data===0)continue;let E=this.gpuDataManager.get(S.data);if(!E)throw new Error(`no GPU data for output: ${S.data}`);if(T&&this.temporaryData.push(E),k){let z=this.kernelPersistentData.get(this.currentKernelId);z||(z=[],this.kernelPersistentData.set(this.currentKernelId,z)),z.push(E)}g.push(E)}if(o.length!==t.length||g.length!==m.length){if(g.length===0)return Ze(e.name),m;throw new Error(`Program ${e.name} has zero-sized tensor(s) in inputs or outputs. This is not supported now.`)}let _;if(d){let $=0,T=[];d.forEach(z=>{let R=typeof z.data=="number"?[z.data]:z.data;if(R.length===0)return;let M=z.type===10?2:4,L,J;z.type===10?(J=R.length>4?16:R.length>2?8:R.length*M,L=R.length>4?16:M*R.length):(J=R.length<=2?R.length*M:16,L=16),$=Math.ceil($/J)*J,T.push($);let H=z.type===10?8:4;$+=R.length>4?Math.ceil(R.length/H)*L:R.length*M});let k=16;$=Math.ceil($/k)*k;let S=new ArrayBuffer($);d.forEach((z,R)=>{let M=T[R],L=typeof z.data=="number"?[z.data]:z.data;if(z.type===6)new Int32Array(S,M,L.length).set(L);else if(z.type===12)new Uint32Array(S,M,L.length).set(L);else if(z.type===10)new Uint16Array(S,M,L.length).set(L);else if(z.type===1)new Float32Array(S,M,L.length).set(L);else throw new Error(`Unsupported uniform type: ${ut(z.type)}`)});let E=this.gpuDataManager.create($,GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM);this.device.queue.writeBuffer(E.buffer,0,S,0,$),this.gpuDataManager.release(E.id),_={offset:0,size:$,buffer:E.buffer}}let b=this.programManager.normalizeDispatchGroupSize(p),w=b[1]===1&&b[2]===1,C=Gl(e,t,w),v=this.programManager.getArtifact(C);if(v||(v=this.programManager.build(e,b),this.programManager.setArtifact(C,v),de("info",()=>`[artifact] key: ${C}, programName: ${e.name}`)),d&&v.uniformVariablesInfo){if(d.length!==v.uniformVariablesInfo.length)throw new Error(`Uniform variables count mismatch: expect ${v.uniformVariablesInfo.length}, got ${d.length} in program "${v.programInfo.name}".`);for(let $=0;$<d.length;$++){let T=d[$],k=T.type,S=typeof T.data=="number"?1:T.data.length,[E,z]=v.uniformVariablesInfo[$];if(k!==E||S!==z)throw new Error(`Uniform variable ${$} mismatch: expect type ${E} with size ${z}, got type ${k} with size ${S} in program "${v.programInfo.name}".`)}}if(de("info",()=>`[ProgramManager] run "${e.name}" (key=${C}) with ${b[0]}x${b[1]}x${b[2]}`),this.queryType!=="none"||this.sessionStatus==="capturing"){let $={kernelId:this.currentKernelId,programName:v.programInfo.name,inputTensorViews:t,outputTensorViews:m};this.pendingKernels.push($),this.sessionStatus==="capturing"&&this.capturedPendingKernels.get(this.currentSessionId).push($)}return this.programManager.run(v,o,g,b,_),Ze(e.name),m}upload(e,t){this.gpuDataManager.upload(e,t)}memcpy(e,t){this.gpuDataManager.memcpy(e,t)}async download(e,t){await this.gpuDataManager.download(e,t)}alloc(e){return this.gpuDataManager.create(e).id}free(e){return this.gpuDataManager.release(e)}createKernel(e,t,i,a){let n=yf.get(e);if(!n)throw new Error(`kernel not implemented: ${e}`);let r={kernelType:e,kernelName:a,kernelEntry:n[0],attributes:[n[1],i]};this.kernels.set(t,r)}releaseKernel(e){let t=this.kernelPersistentData.get(e);if(t){for(let i of t)this.gpuDataManager.release(i.id);this.kernelPersistentData.delete(e)}this.kernelCustomData.delete(e),this.kernels.delete(e)}computeKernel(e,t,i){let a=this.kernels.get(e);if(!a)throw new Error(`kernel not created: ${e}`);let n=a.kernelType,r=a.kernelName,o=a.kernelEntry,u=a.attributes;if(this.currentKernelId!==null)throw new Error(`kernel "[${n}] ${r}" is not allowed to be called recursively`);this.currentKernelId=e,u[0]&&(u[1]=u[0](u[1]),u[0]=void 0),de("info",()=>`[WebGPU] Start to run kernel "[${n}] ${r}"...`);let p=this.env.debug;this.temporaryData=[];try{return p&&this.device.pushErrorScope("validation"),o(t,u[1]),0}catch(d){return i.push(Promise.resolve(`[WebGPU] Kernel "[${n}] ${r}" failed. ${d}`)),1}finally{p&&i.push(this.device.popErrorScope().then(d=>d?`GPU validation error for kernel "[${n}] ${r}": ${d.message}`:null));for(let d of this.temporaryData)this.gpuDataManager.release(d.id);this.temporaryData=[],this.currentKernelId=null}}registerBuffer(e,t,i,a){let n=this.sessionExternalDataMapping.get(e);n||(n=new Map,this.sessionExternalDataMapping.set(e,n));let r=n.get(t),o=this.gpuDataManager.registerExternalBuffer(i,a,r);return n.set(t,[o,i]),o}unregisterBuffers(e){let t=this.sessionExternalDataMapping.get(e);t&&(t.forEach(i=>this.gpuDataManager.unregisterExternalBuffer(i[0])),this.sessionExternalDataMapping.delete(e))}getBuffer(e){let t=this.gpuDataManager.get(e);if(!t)throw new Error(`no GPU data for buffer: ${e}`);return t.buffer}createDownloader(e,t,i){return async()=>{let a=await ya(this,e,t);return Wa(a.buffer,i)}}writeTimestamp(e){this.queryType==="inside-passes"&&this.computePassEncoder.writeTimestamp(this.querySet,e)}setQueryType(){var e;this.queryType="none",(((e=this.env.webgpu.profiling)==null?void 0:e.mode)==="default"||(typeof this.env.trace>"u"?this.env.wasm.trace:this.env.trace))&&(this.device.features.has("chromium-experimental-timestamp-query-inside-passes")?this.queryType="inside-passes":this.device.features.has("timestamp-query")&&(this.queryType="at-passes"),this.queryType!=="none"&&typeof this.querySet>"u"&&(this.querySet=this.device.createQuerySet({type:"timestamp",count:this.maxDispatchNumber*2}),this.queryResolveBuffer=this.device.createBuffer({size:this.maxDispatchNumber*2*8,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.QUERY_RESOLVE})))}captureBegin(){de("info","captureBegin"),this.capturedCommandList.get(this.currentSessionId)||this.capturedCommandList.set(this.currentSessionId,[]),this.capturedPendingKernels.get(this.currentSessionId)||this.capturedPendingKernels.set(this.currentSessionId,[]),this.flush(),this.sessionStatus="capturing"}captureEnd(){de("info","captureEnd"),this.flush(),this.sessionStatus="default"}replay(){de("info","replay"),this.sessionStatus="replaying";let e=this.capturedCommandList.get(this.currentSessionId),t=this.capturedPendingKernels.get(this.currentSessionId),i=e.length;this.pendingKernels=[];for(let a=0;a<i;a++){let n=this.getComputePassEncoder(),r=e[a];this.writeTimestamp(this.pendingDispatchNumber*2),n.setPipeline(r.computePipeline),n.setBindGroup(0,r.bindGroup),n.dispatchWorkgroups(...r.dispatchGroup),this.writeTimestamp(this.pendingDispatchNumber*2+1),this.pendingDispatchNumber++,this.queryType!=="none"&&this.pendingKernels.push(t[a]),(this.pendingDispatchNumber>=this.maxDispatchNumber||this.queryType==="at-passes")&&this.endComputePass(),this.pendingDispatchNumber>=this.maxDispatchNumber&&this.flush()}this.flush(),this.sessionStatus="default"}onCreateSession(){this.gpuDataManager.onCreateSession()}onReleaseSession(e){this.unregisterBuffers(e),this.capturedCommandList.has(e)&&this.capturedCommandList.delete(e),this.capturedPendingKernels.has(e)&&this.capturedPendingKernels.delete(e),this.gpuDataManager.onReleaseSession(e)}onRunStart(e){this.currentSessionId=e,this.setQueryType()}}}),vf={};Gt(vf,{init:()=>xf});var Bi,Fl,xf,wg=q(()=>{re(),lt(),ne(),Im(),Bi=class Cf{constructor(t,i,a,n){this.module=t,this.dataType=i,this.data=a,this.dims=n}getFloat32Array(){if(this.dataType!==1)throw new Error("Invalid data type");let t=O.size(this.dims);return t===0?new Float32Array:new Float32Array(this.module.HEAP8.buffer,this.data,t)}getBigInt64Array(){if(this.dataType!==7)throw new Error("Invalid data type");let t=O.size(this.dims);return t===0?new BigInt64Array:new BigInt64Array(this.module.HEAP8.buffer,this.data,t)}getInt32Array(){if(this.dataType!==6)throw new Error("Invalid data type");let t=O.size(this.dims);return t===0?new Int32Array:new Int32Array(this.module.HEAP8.buffer,this.data,t)}getUint16Array(){if(this.dataType!==10&&this.dataType!==4)throw new Error("Invalid data type");let t=O.size(this.dims);return t===0?new Uint16Array:new Uint16Array(this.module.HEAP8.buffer,this.data,t)}reshape(t){if(O.size(t)!==O.size(this.dims))throw new Error("Invalid new shape");return new Cf(this.module,this.dataType,this.data,t)}},Fl=class{constructor(e,t,i){this.module=e,this.backend=t,this.customDataOffset=0,this.customDataSize=0,this.adapterInfo=t.adapterInfo;let a=e.PTR_SIZE,n=i/e.PTR_SIZE,r=a===4?"i32":"i64";this.opKernelContext=Number(e.getValue(a*n++,r));let o=Number(e.getValue(a*n++,r));this.outputCount=Number(e.getValue(a*n++,r)),this.customDataOffset=Number(e.getValue(a*n++,"*")),this.customDataSize=Number(e.getValue(a*n++,r));let u=[];for(let p=0;p<o;p++){let d=Number(e.getValue(a*n++,r)),f=Number(e.getValue(a*n++,"*")),m=Number(e.getValue(a*n++,r)),g=[];for(let _=0;_<m;_++)g.push(Number(e.getValue(a*n++,r)));u.push(new Bi(e,d,f,g))}this.inputs=u}get kernelCustomData(){return this.backend.currentKernelCustomData}get customDataBuffer(){return this.module.HEAPU8.subarray(this.customDataOffset,this.customDataOffset+this.customDataSize)}compute(e,t){var o;let i=((o=t==null?void 0:t.inputs)==null?void 0:o.map(u=>typeof u=="number"?this.inputs[u]:u))??this.inputs,a=(t==null?void 0:t.outputs)??[],n=(u,p,d)=>new Bi(this.module,p,this.output(u,d),d),r=(u,p)=>{let d=At(u,p);if(!d)throw new Error(`Unsupported data type: ${u}`);let f=d>0?this.backend.gpuDataManager.create(d).id:0;return new Bi(this.module,u,f,p)};return this.backend.run(e,i,a,n,r,this.outputCount)}output(e,t){let i=this.module.stackSave();try{let a=this.module.PTR_SIZE,n=a===4?"i32":"i64",r=this.module.stackAlloc((1+t.length)*a);this.module.setValue(r,t.length,n);for(let o=0;o<t.length;o++)this.module.setValue(r+a*(o+1),t[o],n);return this.module._JsepOutput(this.opKernelContext,e,r)}catch(a){throw new Error(`Failed to generate kernel's output[${e}] with dims [${t}]. If you are running with pre-allocated output, please make sure the output type/dims are correct. Error: ${a}`)}finally{this.module.stackRestore(i)}}},xf=async(e,t,i,a)=>{let n=t.jsepInit;if(!n)throw new Error("Failed to initialize JSEP. The WebAssembly module is not built with JSEP support.");if(e==="webgpu"){let r=(bg(),ci(wf)).WebGpuBackend,o=new r;await o.initialize(i,a),n("webgpu",[o,u=>o.alloc(Number(u)),u=>o.free(u),(u,p,d,f=!1)=>{if(f)de("verbose",()=>`[WebGPU] jsepCopyGpuToGpu: src=${Number(u)}, dst=${Number(p)}, size=${Number(d)}`),o.memcpy(Number(u),Number(p));else{de("verbose",()=>`[WebGPU] jsepCopyCpuToGpu: dataOffset=${Number(u)}, gpuDataId=${Number(p)}, size=${Number(d)}`);let m=t.HEAPU8.subarray(Number(u>>>0),Number(u>>>0)+Number(d));o.upload(Number(p),m)}},async(u,p,d)=>{de("verbose",()=>`[WebGPU] jsepCopyGpuToCpu: gpuDataId=${u}, dataOffset=${p}, size=${d}`),await o.download(Number(u),()=>t.HEAPU8.subarray(Number(p)>>>0,Number(p+d)>>>0))},(u,p,d)=>o.createKernel(u,Number(p),d,t.UTF8ToString(t._JsepGetNodeName(Number(p)))),u=>o.releaseKernel(u),(u,p,d,f)=>{de("verbose",()=>`[WebGPU] jsepRun: sessionHandle=${d}, kernel=${u}, contextDataOffset=${p}`);let m=new Fl(t,o,Number(p));return o.computeKernel(Number(u),m,f)},()=>o.captureBegin(),()=>o.captureEnd(),()=>o.replay()])}else{let r=new Rd(i);n("webnn",[r,()=>r.reserveTensorId(),o=>r.releaseTensorId(o),async(o,u,p,d,f)=>r.ensureTensor(o,u,p,d,f),(o,u)=>{r.uploadTensor(o,u)},async(o,u)=>r.downloadTensor(o,u),(o,u)=>r.registerMLContext(o,u),!!i.trace])}}}),Kl,Qa,Ja,gt,Zl,pa,Hi,en,tn,ca,rn,an,nn,Tf=q(()=>{Le(),Tm(),km(),re(),Mt(),Da(),Sd(),Kl=(e,t)=>{ye()._OrtInit(e,t)!==0&&me("Can't initialize onnxruntime.")},Qa=async e=>{Kl(e.wasm.numThreads,Wi(e.logLevel))},Ja=async(e,t)=>{var a,n;(n=(a=ye()).asyncInit)==null||n.call(a);let i=e.webgpu.adapter;if(t==="webgpu"){if(typeof navigator>"u"||!navigator.gpu)throw new Error("WebGPU is not supported in current environment");if(i){if(typeof i.limits!="object"||typeof i.features!="object"||typeof i.requestDevice!="function")throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.")}else{let r=e.webgpu.powerPreference;if(r!==void 0&&r!=="low-power"&&r!=="high-performance")throw new Error(`Invalid powerPreference setting: "${r}"`);let o=e.webgpu.forceFallbackAdapter;if(o!==void 0&&typeof o!="boolean")throw new Error(`Invalid forceFallbackAdapter setting: "${o}"`);if(i=await navigator.gpu.requestAdapter({powerPreference:r,forceFallbackAdapter:o}),!i)throw new Error('Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.')}}if(t==="webnn"&&(typeof navigator>"u"||!navigator.ml))throw new Error("WebNN is not supported in current environment");{let r=(wg(),ci(vf)).init;t==="webgpu"&&await r("webgpu",ye(),e,i),t==="webnn"&&await r("webnn",ye(),e)}},gt=new Map,Zl=e=>{let t=ye(),i=t.stackSave();try{let a=t.PTR_SIZE,n=t.stackAlloc(2*a);t._OrtGetInputOutputCount(e,n,n+a)!==0&&me("Can't get session input/output count.");let r=a===4?"i32":"i64";return[Number(t.getValue(n,r)),Number(t.getValue(n+a,r))]}finally{t.stackRestore(i)}},pa=(e,t)=>{let i=ye(),a=i.stackSave(),n=0;try{let r=i.PTR_SIZE,o=i.stackAlloc(2*r);i._OrtGetInputOutputMetadata(e,t,o,o+r)!==0&&me("Can't get session input/output metadata.");let u=Number(i.getValue(o,"*"));n=Number(i.getValue(o+r,"*"));let p=i.HEAP32[n/4];if(p===0)return[u,0];let d=i.HEAPU32[n/4+1],f=[];for(let m=0;m<d;m++){let g=Number(i.getValue(n+8+m*r,"*"));f.push(g!==0?i.UTF8ToString(g):Number(i.getValue(n+8+(m+d)*r,"*")))}return[u,p,f]}finally{i.stackRestore(a),n!==0&&i._OrtFree(n)}},Hi=e=>{let t=ye(),i=t._malloc(e.byteLength);if(i===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${e.byteLength}.`);return t.HEAPU8.set(e,i),[i,e.byteLength]},en=async(e,t)=>{var m,g,_,b;let i,a,n=ye();Array.isArray(e)?[i,a]=e:e.buffer===n.HEAPU8.buffer?[i,a]=[e.byteOffset,e.byteLength]:[i,a]=Hi(e);let r=0,o=0,u=0,p=[],d=[],f=[];try{if([o,p]=await kd(t),(t==null?void 0:t.externalData)&&n.mountExternalData){let R=[];for(let M of t.externalData){let L=typeof M=="string"?M:M.path;R.push(Ua(typeof M=="string"?M:M.data).then(J=>{n.mountExternalData(L,J)}))}await Promise.all(R)}for(let R of(t==null?void 0:t.executionProviders)??[])if((typeof R=="string"?R:R.name)==="webnn"){if(n.shouldTransferToMLTensor=!1,typeof R!="string"){let M=R,L=M==null?void 0:M.context,J=M==null?void 0:M.gpuDevice,H=M==null?void 0:M.deviceType,j=M==null?void 0:M.powerPreference;L?n.currentContext=L:J?n.currentContext=await n.webnnCreateMLContext(J):n.currentContext=await n.webnnCreateMLContext({deviceType:H,powerPreference:j})}else n.currentContext=await n.webnnCreateMLContext();break}r=await n._OrtCreateSession(i,a,o),(m=n.webgpuOnCreateSession)==null||m.call(n,r),r===0&&me("Can't create a session."),(g=n.jsepOnCreateSession)==null||g.call(n),n.currentContext&&(n.webnnRegisterMLContext(r,n.currentContext),n.currentContext=void 0,n.shouldTransferToMLTensor=!0);let[w,C]=Zl(r),v=!!(t!=null&&t.enableGraphCapture),$=[],T=[],k=[],S=[],E=[];for(let R=0;R<w;R++){let[M,L,J]=pa(r,R);M===0&&me("Can't get an input name."),d.push(M);let H=n.UTF8ToString(M);$.push(H),k.push(L===0?{name:H,isTensor:!1}:{name:H,isTensor:!0,type:ut(L),shape:J})}for(let R=0;R<C;R++){let[M,L,J]=pa(r,R+w);M===0&&me("Can't get an output name."),f.push(M);let H=n.UTF8ToString(M);T.push(H),S.push(L===0?{name:H,isTensor:!1}:{name:H,isTensor:!0,type:ut(L),shape:J});{if(v&&(t==null?void 0:t.preferredOutputLocation)===void 0){E.push("gpu-buffer");continue}let j=typeof(t==null?void 0:t.preferredOutputLocation)=="string"?t.preferredOutputLocation:((_=t==null?void 0:t.preferredOutputLocation)==null?void 0:_[H])??"cpu",le=n.webnnIsGraphOutput;if(j==="cpu"&&le&&le(r,H)){E.push("ml-tensor-cpu-output");continue}if(j!=="cpu"&&j!=="cpu-pinned"&&j!=="gpu-buffer"&&j!=="ml-tensor")throw new Error(`Not supported preferred output location: ${j}.`);if(v&&j!=="gpu-buffer")throw new Error(`Not supported preferred output location: ${j}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`);E.push(j)}}let z=null;return E.some(R=>R==="gpu-buffer"||R==="ml-tensor"||R==="ml-tensor-cpu-output")&&(u=n._OrtCreateBinding(r),u===0&&me("Can't create IO binding."),z={handle:u,outputPreferredLocations:E,outputPreferredLocationsEncoded:E.map(R=>R==="ml-tensor-cpu-output"?"ml-tensor":R).map(R=>ga(R))}),gt.set(r,[r,d,f,z,v,!1]),[r,$,T,k,S]}catch(w){throw d.forEach(C=>n._OrtFree(C)),f.forEach(C=>n._OrtFree(C)),u!==0&&n._OrtReleaseBinding(u)!==0&&me("Can't release IO binding."),r!==0&&n._OrtReleaseSession(r)!==0&&me("Can't release session."),w}finally{n._free(i),o!==0&&n._OrtReleaseSessionOptions(o)!==0&&me("Can't release session options."),p.forEach(w=>n._free(w)),(b=n.unmountExternalData)==null||b.call(n)}},tn=e=>{var p,d,f;let t=ye(),i=gt.get(e);if(!i)throw new Error(`cannot release session. invalid session id: ${e}`);let[a,n,r,o,u]=i;o&&(u&&t._OrtClearBoundOutputs(o.handle)!==0&&me("Can't clear bound outputs."),t._OrtReleaseBinding(o.handle)!==0&&me("Can't release IO binding.")),(p=t.jsepOnReleaseSession)==null||p.call(t,e),(d=t.webnnOnReleaseSession)==null||d.call(t,e),(f=t.webgpuOnReleaseSession)==null||f.call(t,e),n.forEach(m=>t._OrtFree(m)),r.forEach(m=>t._OrtFree(m)),t._OrtReleaseSession(a)!==0&&me("Can't release session."),gt.delete(e)},ca=async(e,t,i,a,n,r,o=!1)=>{if(!e){t.push(0);return}let u=ye(),p=u.PTR_SIZE,d=e[0],f=e[1],m=e[3],g=m,_,b;if(d==="string"&&(m==="gpu-buffer"||m==="ml-tensor"))throw new Error("String tensor is not supported on GPU.");if(o&&m!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${r} when enableGraphCapture is true.`);if(m==="gpu-buffer"){let v=e[2].gpuBuffer;b=At(zt(d),f);{let $=u.jsepRegisterBuffer;if(!$)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');_=$(a,r,v,b)}}else if(m==="ml-tensor"){let v=e[2].mlTensor;b=At(zt(d),f);let $=u.webnnRegisterMLTensor;if(!$)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');_=$(a,v,zt(d),f)}else{let v=e[2];if(Array.isArray(v)){b=p*v.length,_=u._malloc(b),i.push(_);for(let $=0;$<v.length;$++){if(typeof v[$]!="string")throw new TypeError(`tensor data at index ${$} is not a string`);u.setValue(_+$*p,Ke(v[$],i),"*")}}else{let $=u.webnnIsGraphInput,T=u.webnnIsGraphOutput;if(d!=="string"&&$&&T){let k=u.UTF8ToString(n);if($(a,k)||T(a,k)){let S=zt(d);b=At(S,f),g="ml-tensor";let E=u.webnnCreateTemporaryTensor,z=u.webnnUploadTensor;if(!E||!z)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');let R=await E(a,S,f);z(R,new Uint8Array(v.buffer,v.byteOffset,v.byteLength)),_=R}else b=v.byteLength,_=u._malloc(b),i.push(_),u.HEAPU8.set(new Uint8Array(v.buffer,v.byteOffset,b),_)}else b=v.byteLength,_=u._malloc(b),i.push(_),u.HEAPU8.set(new Uint8Array(v.buffer,v.byteOffset,b),_)}}let w=u.stackSave(),C=u.stackAlloc(4*f.length);try{f.forEach(($,T)=>u.setValue(C+T*p,$,p===4?"i32":"i64"));let v=u._OrtCreateTensor(zt(d),_,b,C,f.length,ga(g));v===0&&me(`Can't create tensor for input/output. session=${a}, index=${r}.`),t.push(v)}finally{u.stackRestore(w)}},rn=async(e,t,i,a,n,r)=>{var J,H,j,le;let o=ye(),u=o.PTR_SIZE,p=gt.get(e);if(!p)throw new Error(`cannot run inference. invalid session id: ${e}`);let d=p[0],f=p[1],m=p[2],g=p[3],_=p[4],b=p[5],w=t.length,C=a.length,v=0,$=[],T=[],k=[],S=[],E=o.stackSave(),z=o.stackAlloc(w*u),R=o.stackAlloc(w*u),M=o.stackAlloc(C*u),L=o.stackAlloc(C*u);try{[v,$]=Td(r),Ot("wasm prepareInputOutputTensor");for(let Y=0;Y<w;Y++)await ca(i[Y],T,S,e,f[t[Y]],t[Y],_);for(let Y=0;Y<C;Y++)await ca(n[Y],k,S,e,m[a[Y]],w+a[Y],_);Rt("wasm prepareInputOutputTensor");for(let Y=0;Y<w;Y++)o.setValue(z+Y*u,T[Y],"*"),o.setValue(R+Y*u,f[t[Y]],"*");for(let Y=0;Y<C;Y++)o.setValue(M+Y*u,k[Y],"*"),o.setValue(L+Y*u,m[a[Y]],"*");if(g&&!b){let{handle:Y,outputPreferredLocations:te,outputPreferredLocationsEncoded:ge}=g;if(f.length!==w)throw new Error(`input count from feeds (${w}) is expected to be always equal to model's input count (${f.length}).`);Ot("wasm bindInputsOutputs");for(let D=0;D<w;D++){let V=t[D];await o._OrtBindInput(Y,f[V],T[D])!==0&&me(`Can't bind input[${D}] for session=${e}.`)}for(let D=0;D<C;D++){let V=a[D];(J=n[D])!=null&&J[3]?o._OrtBindOutput(Y,m[V],k[D],0)!==0&&me(`Can't bind pre-allocated output[${D}] for session=${e}.`):o._OrtBindOutput(Y,m[V],0,ge[V])!==0&&me(`Can't bind output[${D}] to ${te[D]} for session=${e}.`)}Rt("wasm bindInputsOutputs"),gt.set(e,[d,f,m,g,_,!0])}(H=o.jsepOnRunStart)==null||H.call(o,d),(j=o.webnnOnRunStart)==null||j.call(o,d);let ae;g?ae=await o._OrtRunWithBinding(d,g.handle,C,M,v):ae=await o._OrtRun(d,R,z,w,L,C,M,v),ae!==0&&me("failed to call OrtRun().");let Z=[],se=[];Ot("wasm ProcessOutputTensor");for(let Y=0;Y<C;Y++){let te=Number(o.getValue(M+Y*u,"*"));if(te===k[Y]){Z.push(n[Y]);continue}let ge=o.stackSave(),D=o.stackAlloc(4*u),V=!1,G,ee=0;try{o._OrtGetTensorData(te,D,D+u,D+2*u,D+3*u)!==0&&me(`Can't access output tensor data on index ${Y}.`);let Te=u===4?"i32":"i64",Ye=Number(o.getValue(D,Te));ee=o.getValue(D+u,"*");let U=o.getValue(D+u*2,"*"),_e=Number(o.getValue(D+u*3,Te)),Ne=[];for(let he=0;he<_e;he++)Ne.push(Number(o.getValue(U+he*u,Te)));o._OrtFree(U)!==0&&me("Can't free memory for tensor dims.");let Ae=Ne.reduce((he,$e)=>he*$e,1);G=ut(Ye);let it=g==null?void 0:g.outputPreferredLocations[a[Y]];if(G==="string"){if(it==="gpu-buffer"||it==="ml-tensor")throw new Error("String tensor is not supported on GPU.");let he=[];for(let $e=0;$e<Ae;$e++){let De=o.getValue(ee+$e*u,"*"),wt=o.getValue(ee+($e+1)*u,"*"),$t=$e===Ae-1?void 0:wt-De;he.push(o.UTF8ToString(De,$t))}Z.push([G,Ne,he,"cpu"])}else if(it==="gpu-buffer"&&Ae>0){let he=o.jsepGetBuffer;if(!he)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let $e=he(ee),De=At(Ye,Ae);if(De===void 0||!Ma(G))throw new Error(`Unsupported data type: ${G}`);V=!0,Z.push([G,Ne,{gpuBuffer:$e,download:o.jsepCreateDownloader($e,De,G),dispose:()=>{o._OrtReleaseTensor(te)!==0&&me("Can't release tensor.")}},"gpu-buffer"])}else if(it==="ml-tensor"&&Ae>0){let he=o.webnnEnsureTensor,$e=o.webnnIsGraphInputOutputTypeSupported;if(!he||!$e)throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');if(At(Ye,Ae)===void 0||!Pa(G))throw new Error(`Unsupported data type: ${G}`);if(!$e(e,G,!1))throw new Error(`preferredLocation "ml-tensor" for ${G} output is not supported by current WebNN Context.`);let De=await he(e,ee,Ye,Ne,!1);V=!0,Z.push([G,Ne,{mlTensor:De,download:o.webnnCreateMLTensorDownloader(ee,G),dispose:()=>{o.webnnReleaseTensorId(ee),o._OrtReleaseTensor(te)}},"ml-tensor"])}else if(it==="ml-tensor-cpu-output"&&Ae>0){let he=o.webnnCreateMLTensorDownloader(ee,G)(),$e=Z.length;V=!0,se.push((async()=>{let De=[$e,await he];return o.webnnReleaseTensorId(ee),o._OrtReleaseTensor(te),De})()),Z.push([G,Ne,[],"cpu"])}else{let he=Fi(G),$e=new he(Ae);new Uint8Array($e.buffer,$e.byteOffset,$e.byteLength).set(o.HEAPU8.subarray(ee,ee+$e.byteLength)),Z.push([G,Ne,$e,"cpu"])}}finally{o.stackRestore(ge),G==="string"&&ee&&o._free(ee),V||o._OrtReleaseTensor(te)}}g&&!_&&(o._OrtClearBoundOutputs(g.handle)!==0&&me("Can't clear bound outputs."),gt.set(e,[d,f,m,g,_,!1]));for(let[Y,te]of await Promise.all(se))Z[Y][2]=te;return Rt("wasm ProcessOutputTensor"),Z}finally{(le=o.webnnOnRunEnd)==null||le.call(o,d),o.stackRestore(E),T.forEach(ae=>o._OrtReleaseTensor(ae)),k.forEach(ae=>o._OrtReleaseTensor(ae)),S.forEach(ae=>o._free(ae)),v!==0&&o._OrtReleaseRunOptions(v),$.forEach(ae=>o._free(ae))}},an=e=>{let t=ye(),i=gt.get(e);if(!i)throw new Error("invalid session id");let a=i[0],n=t._OrtEndProfiling(a);n===0&&me("Can't get an profile file name."),t._OrtFree(n)},nn=e=>{let t=[];for(let i of e){let a=i[2];!Array.isArray(a)&&"buffer"in a&&t.push(a.buffer)}return t}}),_t,Be,qt,ni,si,Ni,fa,Di,St,It,Yl,kf,Sf,If,Ef,zf,Af,Of,Rf=q(()=>{Le(),Tf(),Mt(),Ba(),_t=()=>!!be.wasm.proxy&&typeof document<"u",qt=!1,ni=!1,si=!1,Di=new Map,St=(e,t)=>{let i=Di.get(e);i?i.push(t):Di.set(e,[t])},It=()=>{if(qt||!ni||si||!Be)throw new Error("worker not ready")},Yl=e=>{switch(e.data.type){case"init-wasm":qt=!1,e.data.err?(si=!0,fa[1](e.data.err)):(ni=!0,fa[0]()),Ni&&(URL.revokeObjectURL(Ni),Ni=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let t=Di.get(e.data.type);e.data.err?t.shift()[1](e.data.err):t.shift()[0](e.data.out);break}}},kf=async()=>{if(!ni){if(qt)throw new Error("multiple calls to 'initWasm()' detected.");if(si)throw new Error("previous call to 'initWasm()' failed.");if(qt=!0,_t())return new Promise((e,t)=>{Be==null||Be.terminate(),xd().then(([i,a])=>{try{Be=a,Be.onerror=r=>t(r),Be.onmessage=Yl,fa=[e,t];let n={type:"init-wasm",in:be};!n.in.wasm.wasmPaths&&(i||ma)&&(n.in.wasm.wasmPaths={wasm:new URL("/scanic/assets/ort-wasm-simd-threaded.jsep.BGTZ4Y7F.wasm",import.meta.url).href}),Be.postMessage(n),Ni=i}catch(n){t(n)}},t)});try{await Na(be.wasm),await Qa(be),ni=!0}catch(e){throw si=!0,e}finally{qt=!1}}},Sf=async e=>{if(_t())return It(),new Promise((t,i)=>{St("init-ep",[t,i]);let a={type:"init-ep",in:{epName:e,env:be}};Be.postMessage(a)});await Ja(be,e)},If=async e=>_t()?(It(),new Promise((t,i)=>{St("copy-from",[t,i]);let a={type:"copy-from",in:{buffer:e}};Be.postMessage(a,[e.buffer])})):Hi(e),Ef=async(e,t)=>{if(_t()){if(t!=null&&t.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return It(),new Promise((i,a)=>{St("create",[i,a]);let n={type:"create",in:{model:e,options:{...t}}},r=[];e instanceof Uint8Array&&r.push(e.buffer),Be.postMessage(n,r)})}else return en(e,t)},zf=async e=>{if(_t())return It(),new Promise((t,i)=>{St("release",[t,i]);let a={type:"release",in:e};Be.postMessage(a)});tn(e)},Af=async(e,t,i,a,n,r)=>{if(_t()){if(i.some(o=>o[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(n.some(o=>o))throw new Error("pre-allocated output tensor is not supported for proxy.");return It(),new Promise((o,u)=>{St("run",[o,u]);let p=i,d={type:"run",in:{sessionId:e,inputIndices:t,inputs:p,outputIndices:a,options:r}};Be.postMessage(d,nn(p))})}else return rn(e,t,i,a,n,r)},Of=async e=>{if(_t())return It(),new Promise((t,i)=>{St("end-profiling",[t,i]);let a={type:"end-profiling",in:e};Be.postMessage(a)});an(e)}}),ha,Xl,Bf,$g=q(()=>{Le(),Rf(),re(),Ra(),Sd(),ha=(e,t)=>{switch(e.location){case"cpu":return[e.type,e.dims,e.data,"cpu"];case"gpu-buffer":return[e.type,e.dims,{gpuBuffer:e.gpuBuffer},"gpu-buffer"];case"ml-tensor":return[e.type,e.dims,{mlTensor:e.mlTensor},"ml-tensor"];default:throw new Error(`invalid data location: ${e.location} for ${t()}`)}},Xl=e=>{switch(e[3]){case"cpu":return new et(e[0],e[2],e[1]);case"gpu-buffer":{let t=e[0];if(!Ma(t))throw new Error(`not supported data type: ${t} for deserializing GPU tensor`);let{gpuBuffer:i,download:a,dispose:n}=e[2];return et.fromGpuBuffer(i,{dataType:t,dims:e[1],download:a,dispose:n})}case"ml-tensor":{let t=e[0];if(!Pa(t))throw new Error(`not supported data type: ${t} for deserializing MLTensor tensor`);let{mlTensor:i,download:a,dispose:n}=e[2];return et.fromMLTensor(i,{dataType:t,dims:e[1],download:a,dispose:n})}default:throw new Error(`invalid data location: ${e[3]}`)}},Bf=class{async fetchModelAndCopyToWasmMemory(e){return If(await Ua(e))}async loadModel(e,t){tt();let i;typeof e=="string"?i=await this.fetchModelAndCopyToWasmMemory(e):i=e,[this.sessionId,this.inputNames,this.outputNames,this.inputMetadata,this.outputMetadata]=await Ef(i,t),Ze()}async dispose(){return zf(this.sessionId)}async run(e,t,i){tt();let a=[],n=[];Object.entries(e).forEach(m=>{let g=m[0],_=m[1],b=this.inputNames.indexOf(g);if(b===-1)throw new Error(`invalid input '${g}'`);a.push(_),n.push(b)});let r=[],o=[];Object.entries(t).forEach(m=>{let g=m[0],_=m[1],b=this.outputNames.indexOf(g);if(b===-1)throw new Error(`invalid output '${g}'`);r.push(_),o.push(b)});let u=a.map((m,g)=>ha(m,()=>`input "${this.inputNames[n[g]]}"`)),p=r.map((m,g)=>m?ha(m,()=>`output "${this.outputNames[o[g]]}"`):null),d=await Af(this.sessionId,n,u,o,p,i),f={};for(let m=0;m<d.length;m++)f[this.outputNames[o[m]]]=r[m]??Xl(d[m]);return Ze(),f}startProfiling(){}endProfiling(){Of(this.sessionId)}}}),Nf={};Gt(Nf,{OnnxruntimeWebAssemblyBackend:()=>za,initializeFlags:()=>Ea,wasmBackend:()=>Df});var Ea,za,Df,vg=q(()=>{Le(),Rf(),$g(),Ea=()=>{(typeof be.wasm.initTimeout!="number"||be.wasm.initTimeout<0)&&(be.wasm.initTimeout=0);let e=be.wasm.simd;if(typeof e!="boolean"&&e!==void 0&&e!=="fixed"&&e!=="relaxed"&&(console.warn(`Property "env.wasm.simd" is set to unknown value "${e}". Reset it to \`false\` and ignore SIMD feature checking.`),be.wasm.simd=!1),typeof be.wasm.proxy!="boolean"&&(be.wasm.proxy=!1),typeof be.wasm.trace!="boolean"&&(be.wasm.trace=!1),typeof be.wasm.numThreads!="number"||!Number.isInteger(be.wasm.numThreads)||be.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)be.wasm.numThreads=1;else{let t=typeof navigator>"u"?um("node:os").cpus().length:navigator.hardwareConcurrency;be.wasm.numThreads=Math.min(4,Math.ceil((t||1)/2))}},za=class{async init(e){Ea(),await kf(),await Sf(e)}async createInferenceSessionHandler(e,t){let i=new Bf;return await i.loadModel(e,t),i}},Df=new za});Le();Le();Le();var xg="1.23.2",Tg=_d;{let e=(vg(),ci(Nf)).wasmBackend;Wt("webgpu",e,5),Wt("webnn",e,5),Wt("cpu",e,10),Wt("wasm",e,10)}Object.defineProperty(be.versions,"web",{value:xg,enumerable:!0});/**
* @license
* Copyright 2021 Google LLC. All Rights Reserved.
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* =============================================================================
*//**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 *//**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */export{gd as InferenceSession,Ui as TRACE,Ot as TRACE_EVENT_BEGIN,Rt as TRACE_EVENT_END,tt as TRACE_FUNC_BEGIN,Ze as TRACE_FUNC_END,et as Tensor,Tg as default,be as env,Wt as registerBackend};
