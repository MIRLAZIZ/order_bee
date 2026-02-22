import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateProductIndex1771732086872 implements MigrationInterface {
    name = 'UpdateProductIndex1771732086872'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`product\` ADD \`isLowStock\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`unit\` DROP FOREIGN KEY \`FK_745632f9034cd78ed2fbea6cd1a\``);
        await queryRunner.query(`DROP INDEX \`IDX_a5483e50555eec93e3cf8d337f\` ON \`unit\``);
        await queryRunner.query(`ALTER TABLE \`unit\` CHANGE \`userId\` \`userId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`product_price_history\` DROP FOREIGN KEY \`FK_9bbe39ab10e86530296c3340aa3\``);
        await queryRunner.query(`ALTER TABLE \`product_price_history\` CHANGE \`product_id\` \`product_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`sales\` DROP FOREIGN KEY \`FK_5015e2759303d7baaf47fc53cc8\``);
        await queryRunner.query(`ALTER TABLE \`sales\` DROP FOREIGN KEY \`FK_a0f1ebffae0628aae642b74d505\``);
        await queryRunner.query(`ALTER TABLE \`sales\` DROP FOREIGN KEY \`FK_5f282f3656814ec9ca2675aef6f\``);
        await queryRunner.query(`ALTER TABLE \`sales\` CHANGE \`cancelled_reason\` \`cancelled_reason\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`sales\` CHANGE \`cancelled_at\` \`cancelled_at\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`sales\` CHANGE \`cancelled_by\` \`cancelled_by\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`sales\` CHANGE \`product_id\` \`product_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`sales\` CHANGE \`product_price_history_id\` \`product_price_history_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`sales\` CHANGE \`user_id\` \`user_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`statistics\` DROP FOREIGN KEY \`FK_62fa61febb58e0ef44ef3cfec1a\``);
        await queryRunner.query(`ALTER TABLE \`statistics\` DROP FOREIGN KEY \`FK_3dfdc7a0491856457f8d6444293\``);
        await queryRunner.query(`DROP INDEX \`IDX_2cccd77b8b8b8b56420f7aa188\` ON \`statistics\``);
        await queryRunner.query(`ALTER TABLE \`statistics\` CHANGE \`user_id\` \`user_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`statistics\` CHANGE \`product_id\` \`product_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`product\` DROP FOREIGN KEY \`FK_3e59a34134d840e83c2010fac9a\``);
        await queryRunner.query(`ALTER TABLE \`product\` DROP FOREIGN KEY \`FK_b15422982adca3bf53adfb535de\``);
        await queryRunner.query(`DROP INDEX \`IDX_44cab5a1b61060ec44fd541a79\` ON \`product\``);
        await queryRunner.query(`DROP INDEX \`IDX_9d9d41c7646f8e53e26f2cbcf7\` ON \`product\``);
        await queryRunner.query(`DROP INDEX \`IDX_a9965a3d21b6af1edf21c91260\` ON \`product\``);
        await queryRunner.query(`ALTER TABLE \`product\` CHANGE \`barcode\` \`barcode\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`product\` CHANGE \`quick_code\` \`quick_code\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`product\` CHANGE \`user_id\` \`user_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`product\` CHANGE \`unit_id\` \`unit_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_13e8b2a21988bec6fdcbb1fa741\``);
        await queryRunner.query(`ALTER TABLE \`categories\` CHANGE \`userId\` \`userId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_45c0d39d1f9ceeb56942db93cc5\``);
        await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`brandName\` \`brandName\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`createdById\` \`createdById\` int NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_a5483e50555eec93e3cf8d337f\` ON \`unit\` (\`name\`, \`userId\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_2cccd77b8b8b8b56420f7aa188\` ON \`statistics\` (\`user_id\`, \`product_id\`, \`date\`)`);
        await queryRunner.query(`CREATE INDEX \`idx_low_stock_by_user\` ON \`product\` (\`id\`, \`isLowStock\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_9d9d41c7646f8e53e26f2cbcf7\` ON \`product\` (\`quick_code\`, \`user_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_44cab5a1b61060ec44fd541a79\` ON \`product\` (\`barcode\`, \`user_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_a9965a3d21b6af1edf21c91260\` ON \`product\` (\`name\`, \`user_id\`)`);
        await queryRunner.query(`ALTER TABLE \`unit\` ADD CONSTRAINT \`FK_745632f9034cd78ed2fbea6cd1a\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`product_price_history\` ADD CONSTRAINT \`FK_9bbe39ab10e86530296c3340aa3\` FOREIGN KEY (\`product_id\`) REFERENCES \`product\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sales\` ADD CONSTRAINT \`FK_5015e2759303d7baaf47fc53cc8\` FOREIGN KEY (\`product_id\`) REFERENCES \`product\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sales\` ADD CONSTRAINT \`FK_a0f1ebffae0628aae642b74d505\` FOREIGN KEY (\`product_price_history_id\`) REFERENCES \`product_price_history\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sales\` ADD CONSTRAINT \`FK_5f282f3656814ec9ca2675aef6f\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`statistics\` ADD CONSTRAINT \`FK_62fa61febb58e0ef44ef3cfec1a\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`statistics\` ADD CONSTRAINT \`FK_3dfdc7a0491856457f8d6444293\` FOREIGN KEY (\`product_id\`) REFERENCES \`product\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`product\` ADD CONSTRAINT \`FK_3e59a34134d840e83c2010fac9a\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`product\` ADD CONSTRAINT \`FK_b15422982adca3bf53adfb535de\` FOREIGN KEY (\`unit_id\`) REFERENCES \`unit\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_13e8b2a21988bec6fdcbb1fa741\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD CONSTRAINT \`FK_45c0d39d1f9ceeb56942db93cc5\` FOREIGN KEY (\`createdById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_45c0d39d1f9ceeb56942db93cc5\``);
        await queryRunner.query(`ALTER TABLE \`categories\` DROP FOREIGN KEY \`FK_13e8b2a21988bec6fdcbb1fa741\``);
        await queryRunner.query(`ALTER TABLE \`product\` DROP FOREIGN KEY \`FK_b15422982adca3bf53adfb535de\``);
        await queryRunner.query(`ALTER TABLE \`product\` DROP FOREIGN KEY \`FK_3e59a34134d840e83c2010fac9a\``);
        await queryRunner.query(`ALTER TABLE \`statistics\` DROP FOREIGN KEY \`FK_3dfdc7a0491856457f8d6444293\``);
        await queryRunner.query(`ALTER TABLE \`statistics\` DROP FOREIGN KEY \`FK_62fa61febb58e0ef44ef3cfec1a\``);
        await queryRunner.query(`ALTER TABLE \`sales\` DROP FOREIGN KEY \`FK_5f282f3656814ec9ca2675aef6f\``);
        await queryRunner.query(`ALTER TABLE \`sales\` DROP FOREIGN KEY \`FK_a0f1ebffae0628aae642b74d505\``);
        await queryRunner.query(`ALTER TABLE \`sales\` DROP FOREIGN KEY \`FK_5015e2759303d7baaf47fc53cc8\``);
        await queryRunner.query(`ALTER TABLE \`product_price_history\` DROP FOREIGN KEY \`FK_9bbe39ab10e86530296c3340aa3\``);
        await queryRunner.query(`ALTER TABLE \`unit\` DROP FOREIGN KEY \`FK_745632f9034cd78ed2fbea6cd1a\``);
        await queryRunner.query(`DROP INDEX \`IDX_a9965a3d21b6af1edf21c91260\` ON \`product\``);
        await queryRunner.query(`DROP INDEX \`IDX_44cab5a1b61060ec44fd541a79\` ON \`product\``);
        await queryRunner.query(`DROP INDEX \`IDX_9d9d41c7646f8e53e26f2cbcf7\` ON \`product\``);
        await queryRunner.query(`DROP INDEX \`idx_low_stock_by_user\` ON \`product\``);
        await queryRunner.query(`DROP INDEX \`IDX_2cccd77b8b8b8b56420f7aa188\` ON \`statistics\``);
        await queryRunner.query(`DROP INDEX \`IDX_a5483e50555eec93e3cf8d337f\` ON \`unit\``);
        await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`createdById\` \`createdById\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`brandName\` \`brandName\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD CONSTRAINT \`FK_45c0d39d1f9ceeb56942db93cc5\` FOREIGN KEY (\`createdById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`categories\` CHANGE \`userId\` \`userId\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`categories\` ADD CONSTRAINT \`FK_13e8b2a21988bec6fdcbb1fa741\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`product\` CHANGE \`unit_id\` \`unit_id\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`product\` CHANGE \`user_id\` \`user_id\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`product\` CHANGE \`quick_code\` \`quick_code\` varchar(20) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`product\` CHANGE \`barcode\` \`barcode\` varchar(255) NULL DEFAULT 'NULL'`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_a9965a3d21b6af1edf21c91260\` ON \`product\` (\`name\`, \`user_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_9d9d41c7646f8e53e26f2cbcf7\` ON \`product\` (\`quick_code\`, \`user_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_44cab5a1b61060ec44fd541a79\` ON \`product\` (\`barcode\`, \`user_id\`)`);
        await queryRunner.query(`ALTER TABLE \`product\` ADD CONSTRAINT \`FK_b15422982adca3bf53adfb535de\` FOREIGN KEY (\`unit_id\`) REFERENCES \`unit\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`product\` ADD CONSTRAINT \`FK_3e59a34134d840e83c2010fac9a\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`statistics\` CHANGE \`product_id\` \`product_id\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`statistics\` CHANGE \`user_id\` \`user_id\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_2cccd77b8b8b8b56420f7aa188\` ON \`statistics\` (\`user_id\`, \`product_id\`, \`date\`)`);
        await queryRunner.query(`ALTER TABLE \`statistics\` ADD CONSTRAINT \`FK_3dfdc7a0491856457f8d6444293\` FOREIGN KEY (\`product_id\`) REFERENCES \`product\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`statistics\` ADD CONSTRAINT \`FK_62fa61febb58e0ef44ef3cfec1a\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sales\` CHANGE \`user_id\` \`user_id\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`sales\` CHANGE \`product_price_history_id\` \`product_price_history_id\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`sales\` CHANGE \`product_id\` \`product_id\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`sales\` CHANGE \`cancelled_by\` \`cancelled_by\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`sales\` CHANGE \`cancelled_at\` \`cancelled_at\` timestamp NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`sales\` CHANGE \`cancelled_reason\` \`cancelled_reason\` text NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`sales\` ADD CONSTRAINT \`FK_5f282f3656814ec9ca2675aef6f\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sales\` ADD CONSTRAINT \`FK_a0f1ebffae0628aae642b74d505\` FOREIGN KEY (\`product_price_history_id\`) REFERENCES \`product_price_history\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sales\` ADD CONSTRAINT \`FK_5015e2759303d7baaf47fc53cc8\` FOREIGN KEY (\`product_id\`) REFERENCES \`product\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`product_price_history\` CHANGE \`product_id\` \`product_id\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`ALTER TABLE \`product_price_history\` ADD CONSTRAINT \`FK_9bbe39ab10e86530296c3340aa3\` FOREIGN KEY (\`product_id\`) REFERENCES \`product\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`unit\` CHANGE \`userId\` \`userId\` int NULL DEFAULT 'NULL'`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_a5483e50555eec93e3cf8d337f\` ON \`unit\` (\`name\`, \`userId\`)`);
        await queryRunner.query(`ALTER TABLE \`unit\` ADD CONSTRAINT \`FK_745632f9034cd78ed2fbea6cd1a\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`product\` DROP COLUMN \`isLowStock\``);
    }

}
