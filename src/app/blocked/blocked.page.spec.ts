import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BlockedPage } from './blocked.page';

describe('BlockedPage', () => {
  let component: BlockedPage;
  let fixture: ComponentFixture<BlockedPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BlockedPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
