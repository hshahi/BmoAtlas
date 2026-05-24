import { Directive } from '@angular/core';
import { Hub } from '../hub/hub';

@Directive()
export abstract class ComponentBase extends Hub {}
