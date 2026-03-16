import {UAParser} from "ua-parser-js";

export function logclick(urlId, req){
    _insert(urlId, req).catch((err) =>
        console.error('[analytics] insert error:', err?.message)
    );
}