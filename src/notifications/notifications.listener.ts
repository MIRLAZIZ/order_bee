import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
// import { ProductsService } from 'src/products/products.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsListener {
  constructor(
    // private readonly productService: ProductsService,
    private readonly notificationService: NotificationsService,
  ) {}

  @OnEvent('sales.created')

  async handleLowStock(payload: any) {


    console.log(payload, 'bu event listener');
    // const product = await this.productService.findById(payload.productId);

    // if (product.quantity <= product.max_quantity_notification) {
    //   await this.notificationService.sendLowStock({
    //     productId: product.id,
    //     name: product.name,
    //     quantity: product.quantity,
    //   });
    // }
  }
}
