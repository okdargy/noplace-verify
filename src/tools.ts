import noplaceApiHelper from './api';
import codesHelper from './codes';

export const tools: {
    api: noplaceApiHelper
    codes: codesHelper
} = {
    api: new noplaceApiHelper(),
    codes: new codesHelper()
}