import { Injectable } from '@angular/core';
import { Hub } from '../hub/hub';

@Injectable()
export abstract class ServiceBase extends Hub {}
