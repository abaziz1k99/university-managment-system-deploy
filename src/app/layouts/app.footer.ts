import { Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `<div class="layout-footer">
        UniManage — University Administration Portal
        <span class="ml-2 text-muted-color">| Demo data — not a production system</span>
    </div>`
})
export class AppFooter {}

